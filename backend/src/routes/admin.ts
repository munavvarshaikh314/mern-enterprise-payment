import express from 'express';
import {
  getAnalyticsDashboard,
  getAllPayments,
  getRevenueByRegion,
  getTopUsersByRevenue,
  getMonthlyRevenue,
  getPaymentAnalytics,
  getUserAnalytics,
  exportData,
} from '../controllers/adminController';
import { authenticate, requireAdmin, requirePermission } from '../middleware/auth';
import {
  validateRegionFilter,
  validateDateRange,
  validatePagination,
} from '../middleware/validation';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// Analytics dashboard
router.get('/dashboard', requirePermission('view_analytics'), validateRegionFilter, validateDateRange, getAnalyticsDashboard);

// Revenue analytics
router.get('/revenue/by-region', getRevenueByRegion);
router.get('/revenue/monthly', getMonthlyRevenue);

// User analytics
router.get('/users/top-by-revenue', validateRegionFilter, getTopUsersByRevenue);
router.get('/users/analytics', validateRegionFilter, getUserAnalytics);

// Payment analytics
router.get('/payments', validatePagination, validateRegionFilter, validateDateRange, getAllPayments);
router.get('/payments/analytics', validateRegionFilter, validateDateRange, getPaymentAnalytics);

// Data export
router.get('/export', requirePermission('export_data'), validateRegionFilter, validateDateRange, exportData);

export default router;

