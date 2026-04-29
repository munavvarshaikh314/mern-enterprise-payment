import { Response } from 'express';
import User from '../models/User';
import Payment from '../models/Payment';
import Transaction from '../models/postgres/Transaction';
import Invoice from '../models/Invoice';
import sequelize from '../config/postgres';
import { Op } from 'sequelize';
import { AuthenticatedRequest, ApiResponse, IAnalytics } from '../types';
import { asyncHandler, createSuccessResponse, createErrorResponse } from '../middleware/errorHandler';


import { Types } from 'mongoose';

interface RegionStat {
  region: string;
  userCount: number;
  revenue: number;
}

interface AnalyticsTopUser {
  userId: Types.ObjectId;
  email: string;
  firstName: string;
  lastName: string;
  region?: string;
  totalRevenue: number;
  totalPayments: number;
}

const getString = (value: unknown, defaultValue = ''): string => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return defaultValue;
};

const getNumber = (value: unknown, defaultValue: number): number => {
  const parsed = parseInt(getString(value), 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
};

// Get comprehensive analytics dashboard
export const getAnalyticsDashboard = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const region = req.query.region as string;
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;

  try {
    // Build date filter
    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Build user filter for region
    const userFilter: any = {};
    if (region) {
      userFilter.region = region;
    }

    // Get basic statistics
    const totalUsers = await User.countDocuments(userFilter);
    
    // Fetch financial data from PostgreSQL for ACID-compliant accuracy
    const pgDateFilter: any = { status: 'completed' };
    if (startDate || endDate) {
      pgDateFilter.createdAt = {};
      if (startDate) pgDateFilter.createdAt[Op.gte] = new Date(startDate);
      if (endDate) pgDateFilter.createdAt[Op.lte] = new Date(endDate);
    }

    const totalPayments = await Transaction.count({ where: pgDateFilter });
    const totalRevenueResult = await Transaction.sum('amount', { where: pgDateFilter });
    const totalRevenue = totalRevenueResult || 0;

    // Get region statistics from PostgreSQL
    const regionStats: RegionStat[] = await Payment.aggregate([
  {
    $match: {
      status: 'completed',
      ...dateFilter
    }
  },
  {
    $lookup: {
      from: 'users',
      localField: 'userId',
      foreignField: '_id',
      as: 'user'
    }
  },
  { $unwind: '$user' },
  {
    $group: {
      _id: '$user.region',
      userCount: { $addToSet: '$user._id' },
      revenue: { $sum: '$amount' }
    }
  },
  {
    $project: {
      region: '$_id',
      userCount: { $size: '$userCount' },
      revenue: 1,
      _id: 0
    }
  }
]);
    // Filter region stats if region filter is applied
    const filteredRegionStats = region
  ? regionStats.filter(r => r.region === region)
  : regionStats;

  const rawTopUsers = await Payment.getTopUsersByRevenue(5);

const topUsers: AnalyticsTopUser[] = rawTopUsers.map((u: any) => ({
  userId: new Types.ObjectId(u.userId),
  email: u.email,
  firstName: u.firstName,
  lastName: u.lastName,
  region: u.region,
  totalRevenue: u.totalRevenue,
  totalPayments: u.totalPayments ?? 0,
}));

const filteredTopUsers = region
  ? topUsers.filter(user => user.region === region)
  : topUsers;


    // Get monthly revenue for the last 12 months
    const monthlyRevenue = await Payment.getMonthlyRevenue(12);

    // Get payment status distribution
    const statusDistribution = await Payment.aggregate([
      { 
        $match: dateFilter 
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        }
      },
      {
        $project: {
          status: '$_id',
          count: 1,
          totalAmount: 1,
          _id: 0,
        }
      }
    ]);

    // Get currency distribution
    const currencyDistribution = await Payment.aggregate([
      { 
        $match: { 
          status: 'completed',
          ...dateFilter 
        } 
      },
      {
        $group: {
          _id: '$currency',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        }
      },
      {
        $project: {
          currency: '$_id',
          count: 1,
          totalAmount: 1,
          _id: 0,
        }
      }
    ]);

    // Get recent activity
    const recentPayments = await Payment.find(dateFilter)
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('userId', 'firstName lastName email region')
      .lean();

    // Get growth metrics (compare with previous period)
    const periodDays = startDate && endDate 
      ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
      : 30;

    const previousPeriodStart = new Date();
    const previousPeriodEnd = new Date();
    
    if (startDate && endDate) {
      previousPeriodEnd.setTime(new Date(startDate).getTime() - 1);
      previousPeriodStart.setTime(previousPeriodEnd.getTime() - (periodDays * 24 * 60 * 60 * 1000));
    } else {
      previousPeriodEnd.setDate(previousPeriodEnd.getDate() - periodDays);
      previousPeriodStart.setDate(previousPeriodStart.getDate() - (periodDays * 2));
    }

    const previousPeriodRevenue = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: {
            $gte: previousPeriodStart,
            $lte: previousPeriodEnd,
          }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalPayments: { $sum: 1 },
        }
      }
    ]);

    const previousRevenue = previousPeriodRevenue[0]?.totalRevenue || 0;
    const previousPayments = previousPeriodRevenue[0]?.totalPayments || 0;

    const revenueGrowth = previousRevenue > 0 
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
      : 0;
    
    const paymentsGrowth = previousPayments > 0 
      ? ((totalPayments - previousPayments) / previousPayments) * 100 
      : 0;

    const analytics: IAnalytics = {
  totalUsers,
  totalRevenue,
  totalPayments,
  regionStats: filteredRegionStats,
  topUsers: filteredTopUsers,
  monthlyRevenue,
};


    const responseData = {
      analytics,
      statusDistribution,
      currencyDistribution,
      recentPayments,
      growth: {
        revenue: revenueGrowth,
        payments: paymentsGrowth,
      },
      filters: {
        region,
        startDate,
        endDate,
      },
    };

    // Cache the response for 5 minutes
    //await setCache(cacheKey, responseData, 300);

    res.json(createSuccessResponse(
      'Analytics dashboard data retrieved successfully',
      responseData
    ));
  } catch (error) {
    console.error('Error fetching analytics dashboard:', error);
    res.status(500).json(createErrorResponse('Failed to fetch analytics data'));
  }
});

// Get revenue by region
export const getRevenueByRegion = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const revenueByRegion = await Payment.getRevenueByRegion();
    
    res.json(createSuccessResponse(
      'Revenue by region retrieved successfully',
      { revenueByRegion }
    ));
  } catch (error) {
    console.error('Error fetching revenue by region:', error);
    res.status(500).json(createErrorResponse('Failed to fetch revenue by region'));
  }
});

// Get top users by revenue
export const getTopUsersByRevenue = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const limit = parseInt(req.query.limit as string) || 5;
  const region = req.query.region as string;

  try {
    let topUsers = await Payment.getTopUsersByRevenue(limit);
    
    // Filter by region if specified
    if (region) {
      topUsers = topUsers.filter((user: { region: string; }) => user.region === region);
    }

    res.json(createSuccessResponse(
      'Top users by revenue retrieved successfully',
      { topUsers }
    ));
  } catch (error) {
    console.error('Error fetching top users by revenue:', error);
    res.status(500).json(createErrorResponse('Failed to fetch top users by revenue'));
  }
});

// Get monthly revenue trends
export const getMonthlyRevenue = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const months = parseInt(req.query.months as string) || 12;

  try {
    const monthlyRevenue = await Payment.getMonthlyRevenue(months);
    
    res.json(createSuccessResponse(
      'Monthly revenue trends retrieved successfully',
      { monthlyRevenue }
    ));
  } catch (error) {
    console.error('Error fetching monthly revenue:', error);
    res.status(500).json(createErrorResponse('Failed to fetch monthly revenue'));
  }
});

// Get all payments with filters (admin)
export const getAllPayments = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const page = Math.max(getNumber(req.query.page, 1), 1);
  const limit = Math.min(Math.max(getNumber(req.query.limit, 10), 1), 100);
  const region = getString(req.query.region);
  const search = getString(req.query.search);
  const status = getString(req.query.status);
  const startDate = getString(req.query.startDate);
  const endDate = getString(req.query.endDate);
  const requestedSort = getString(req.query.sort, '-createdAt');
  const sortField = requestedSort.replace(/^-/, '');
  const sortDirection = requestedSort.startsWith('-') ? -1 : 1;
  const allowedSortFields = new Set(['createdAt', 'updatedAt', 'amount']);

  try {
    const match: Record<string, any> = {};

    if (status) {
      match.status = status;
    }

    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    const pipeline: any[] = [
      { $match: match },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userId',
        },
      },
      { $unwind: '$userId' },
      {
        $lookup: {
          from: 'invoices',
          localField: '_id',
          foreignField: 'paymentId',
          as: 'invoice',
        },
      },
      {
        $addFields: {
          invoiceId: { $ifNull: [{ $arrayElemAt: ['$invoice._id', 0] }, null] },
        },
      },
    ];

    if (region) {
      pipeline.push({
        $match: {
          'userId.region': region,
        },
      });
    }

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { description: { $regex: search, $options: 'i' } },
            { razorpayOrderId: { $regex: search, $options: 'i' } },
            { razorpayPaymentId: { $regex: search, $options: 'i' } },
            { 'userId.firstName': { $regex: search, $options: 'i' } },
            { 'userId.lastName': { $regex: search, $options: 'i' } },
            { 'userId.email': { $regex: search, $options: 'i' } },
          ],
        },
      });
    }

    pipeline.push(
      {
        $sort: {
          [allowedSortFields.has(sortField) ? sortField : 'createdAt']: sortDirection,
        },
      },
      {
        $facet: {
          payments: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
              $project: {
                invoice: 0,
                'userId.password': 0,
                'userId.__v': 0,
              },
            },
          ],
          totalCount: [{ $count: 'count' }],
        },
      },
    );

    const [result] = await Payment.aggregate(pipeline);
    const payments = result?.payments || [];
    const total = result?.totalCount?.[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    res.json(
      createSuccessResponse('Payments retrieved successfully', {
        payments,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      })
    );
  } catch (error) {
    console.error('Error fetching admin payments:', error);
    res.status(500).json(createErrorResponse('Failed to fetch payments'));
  }
});

// Get payment analytics
export const getPaymentAnalytics = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const region = req.query.region as string;
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;

  try {
    // Build date filter
    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Payment status distribution
    const statusDistribution = await Payment.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        }
      }
    ]);

    // Average payment amount
    const avgPaymentResult = await Payment.aggregate([
      { 
        $match: { 
          status: 'completed',
          ...dateFilter 
        } 
      },
      {
        $group: {
          _id: null,
          avgAmount: { $avg: '$amount' },
          minAmount: { $min: '$amount' },
          maxAmount: { $max: '$amount' },
        }
      }
    ]);

    // Payment frequency by day of week
    const paymentsByDayOfWeek = await Payment.aggregate([
      { 
        $match: { 
          status: 'completed',
          ...dateFilter 
        } 
      },
      {
        $group: {
          _id: { $dayOfWeek: '$createdAt' },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        }
      },
      {
        $project: {
          dayOfWeek: '$_id',
          count: 1,
          totalAmount: 1,
          _id: 0,
        }
      },
      { $sort: { dayOfWeek: 1 } }
    ]);

    // Payment frequency by hour of day
    const paymentsByHour = await Payment.aggregate([
      { 
        $match: { 
          status: 'completed',
          ...dateFilter 
        } 
      },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        }
      },
      {
        $project: {
          hour: '$_id',
          count: 1,
          totalAmount: 1,
          _id: 0,
        }
      },
      { $sort: { hour: 1 } }
    ]);

    res.json(createSuccessResponse(
      'Payment analytics retrieved successfully',
      {
        statusDistribution,
        averagePayment: avgPaymentResult[0] || { avgAmount: 0, minAmount: 0, maxAmount: 0 },
        paymentsByDayOfWeek,
        paymentsByHour,
      }
    ));
  } catch (error) {
    console.error('Error fetching payment analytics:', error);
    res.status(500).json(createErrorResponse('Failed to fetch payment analytics'));
  }
});

// Get user analytics
export const getUserAnalytics = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const region = req.query.region as string;

  try {
    // Build user filter
    const userFilter: any = {};
    if (region) {
      userFilter.region = region;
    }

    // User registration trends (last 12 months)
    const registrationTrends = await User.aggregate([
      { $match: userFilter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          month: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              {
                $cond: {
                  if: { $lt: ['$_id.month', 10] },
                  then: { $concat: ['0', { $toString: '$_id.month' }] },
                  else: { $toString: '$_id.month' }
                }
              }
            ]
          },
          count: 1,
          _id: 0
        }
      },
      { $sort: { month: 1 } },
      { $limit: 12 }
    ]);

    // Users by region
    const usersByRegion = await User.aggregate([
      { $match: userFilter },
      {
        $group: {
          _id: '$region',
          count: { $sum: 1 },
        }
      },
      {
        $project: {
          region: '$_id',
          count: 1,
          _id: 0,
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Users by verification status
    const verificationStats = await User.aggregate([
      { $match: userFilter },
      {
        $group: {
          _id: '$isEmailVerified',
          count: { $sum: 1 },
        }
      }
    ]);

    // Users with 2FA enabled
    const twoFactorStats = await User.aggregate([
      { $match: userFilter },
      {
        $group: {
          _id: '$preferences.twoFactorAuth',
          count: { $sum: 1 },
        }
      }
    ]);

    res.json(createSuccessResponse(
      'User analytics retrieved successfully',
      {
        registrationTrends,
        usersByRegion,
        verificationStats,
        twoFactorStats,
      }
    ));
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    res.status(500).json(createErrorResponse('Failed to fetch user analytics'));
  }
});

// Export data for reporting
export const exportData = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { type, format, startDate, endDate, region } = req.query;

  try {
    let data: any[] = [];
    
    // Build filters
    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate as string);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate as string);
    }

    const userFilter: any = {};
    if (region) {
      userFilter.region = region;
    }

    switch (type) {
      case 'users':
        data = await User.find(userFilter).select('-password').lean();
        break;
      case 'payments':
        data = await Payment.find(dateFilter).populate('userId', 'firstName lastName email region').lean();
        break;
      case 'invoices':
        data = await Invoice.find(dateFilter).populate('userId', 'firstName lastName email').lean();
        break;
      default:
        res.status(400).json(createErrorResponse('Invalid export type'));
        return;
    }

    // For now, return JSON data (can be extended to support CSV, Excel, etc.)
    res.json(createSuccessResponse(
      `${type} data exported successfully`,
      {
        data,
        count: data.length,
        exportedAt: new Date(),
        filters: { startDate, endDate, region },
      }
    ));
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json(createErrorResponse('Failed to export data'));
  }
});
