import express from 'express';
import {
  getDashboard,
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  getUserStats,
  getMe,
  updateMe,
} from '../controllers/userController';
import { authenticate, requireUser, requireAdmin } from '../middleware/auth';
import {
  validatePagination,
  validateObjectId,
  validateRegionFilter,
} from '../middleware/validation';

const router = express.Router();

// All user routes require authentication
router.use(authenticate);

// User routes
router.get('/me', requireUser, getMe);

router.put('/me', requireUser, updateMe);
// Existing routes
router.get('/dashboard', requireUser, getDashboard);

// Admin routes
router.get('/', requireAdmin, validatePagination, validateRegionFilter, getAllUsers);
router.get('/stats', requireAdmin, getUserStats);
router.get('/:userId', requireAdmin, validateObjectId('userId'), getUserById);
router.put('/:userId/role', requireAdmin, validateObjectId('userId'), updateUserRole);
router.delete('/:userId', requireAdmin, validateObjectId('userId'), deleteUser);

export default router;