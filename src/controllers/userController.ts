import { Response } from 'express';
import User from '../models/User';
import Payment from '../models/Payment';
import { AuthenticatedRequest } from '../types';
import {
  asyncHandler,
  createSuccessResponse,
  createErrorResponse,
} from '../middleware/errorHandler';

/* ---------------------------------------------------
   Helpers (fix string | string[] | undefined issues)
--------------------------------------------------- */

const getString = (value: unknown, defaultValue = ''): string => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return defaultValue;
};

const getNumber = (value: unknown, defaultValue: number): number => {
  const str = getString(value);
  const num = parseInt(str, 10);
  return isNaN(num) ? defaultValue : num;
};

/* ---------------------------------------------------
   Dashboard
--------------------------------------------------- */

export const getDashboard = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user!;
    const userId = user._id.toString();

    const paymentStats = await Payment.getUserStats(userId);

    const recentPayments = await Payment.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const statusDistribution = await Payment.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    res.json(
      createSuccessResponse('Dashboard data retrieved successfully', {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          region: user.region,
          language: user.language,
          memberSince: user.createdAt,
        },
        paymentStats,
        recentPayments,
        statusDistribution,
      }),
    );
  },
);

/* ---------------------------------------------------
   Get All Users (Admin)
--------------------------------------------------- */

export const getAllUsers = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const page = getNumber(req.query.page, 1);
    const limit = getNumber(req.query.limit, 10);
    const search = getString(req.query.search);
    const region = getString(req.query.region);
    const role = getString(req.query.role);
    const sort = getString(req.query.sort, '-createdAt');

    const query: Record<string, any> = {};

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (region) query.region = region;
    if (role) query.role = role;

    const skip = (page - 1) * limit;

    const users = await User.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('-password')
      .lean();

    const total = await User.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    const usersWithStats = await Promise.all(
      users.map(async (user: any) => {
        const paymentStats = await Payment.getUserStats(user._id.toString());
        return { ...user, paymentStats };
      }),
    );

    res.json(
      createSuccessResponse('Users retrieved successfully', {
        users: usersWithStats,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      }),
    );
  },
);

/* ---------------------------------------------------
   Get User By ID (Admin)
--------------------------------------------------- */

export const getUserById = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = getString(req.params.userId);

    const user = await User.findById(userId).select('-password');
    if (!user) {
      res.status(404).json(createErrorResponse('User not found'));
      return;
    }

    const paymentStats = await Payment.getUserStats(userId);

    const recentPayments = await Payment.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json(
      createSuccessResponse('User details retrieved successfully', {
        user,
        paymentStats,
        recentPayments,
      }),
    );
  },
);

/* ---------------------------------------------------
   Update User Role (Admin)
--------------------------------------------------- */

export const updateUserRole = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = getString(req.params.userId);
    const role = getString(req.body.role) as 'user' | 'admin';

    if (!['user', 'admin'].includes(role)) {
      res.status(400).json(createErrorResponse('Invalid role'));
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json(createErrorResponse('User not found'));
      return;
    }

    user.role = role;
    await user.save();

    res.json(
      createSuccessResponse('User role updated successfully', {
        userId: user._id,
        email: user.email,
        role: user.role,
      }),
    );
  },
);

/* ---------------------------------------------------
   Delete User (Admin)
--------------------------------------------------- */

export const deleteUser = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = getString(req.params.userId);
    const currentUserId = req.user!._id.toString();

    if (userId === currentUserId) {
      res
        .status(400)
        .json(createErrorResponse('Cannot delete your own account'));
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json(createErrorResponse('User not found'));
      return;
    }

    const paymentCount = await Payment.countDocuments({ userId });
    if (paymentCount > 0) {
      res
        .status(400)
        .json(createErrorResponse('Cannot delete user with existing payments'));
      return;
    }

    await User.findByIdAndDelete(userId);
    res.json(createSuccessResponse('User deleted successfully'));
  },
);

/* ---------------------------------------------------
   Global User Statistics
--------------------------------------------------- */

export const getUserStats = asyncHandler(
  async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({
      isEmailVerified: true,
    });
    const adminUsers = await User.countDocuments({ role: 'admin' });

    const usersByRegion = await User.aggregate([
      { $group: { _id: '$region', count: { $sum: 1 } } },
      { $project: { region: '$_id', count: 1, _id: 0 } },
      { $sort: { count: -1 } },
    ]);

    const usersByLanguage = await User.aggregate([
      { $group: { _id: '$language', count: { $sum: 1 } } },
      { $project: { language: '$_id', count: 1, _id: 0 } },
      { $sort: { count: -1 } },
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentRegistrations = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    res.json(
      createSuccessResponse('User statistics retrieved successfully', {
        totalUsers,
        verifiedUsers,
        adminUsers,
        recentRegistrations,
        usersByRegion,
        usersByLanguage,
      }),
    );
  },
);

/* ---------------------------------------------------
   Get Current Logged-in User
--------------------------------------------------- */

export const getMe = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user!;

    res.json(
      createSuccessResponse('User profile retrieved successfully', {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        region: user.region,
        language: user.language,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
      }),
    );
  },
);

/* ---------------------------------------------------
   Update Current User Profile
--------------------------------------------------- */

export const updateMe = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!._id;

    const allowedUpdates = ['firstName', 'lastName', 'region', 'language'];
    const updates: any = {};

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json(
      createSuccessResponse('Profile updated successfully', user),
    );
  },
);


