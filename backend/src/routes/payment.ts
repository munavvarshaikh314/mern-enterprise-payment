import express from 'express';
import {
  createPayment,
  verifyPayment,
  getUserPayments,
  getPaymentDetails,
  downloadInvoice,
  refundPayment,
  getPaymentStats,
  markPaymentDisputed,
  resendReceipt,
} from '../controllers/paymentController';
import { authenticate, requireUser, requireAdmin } from '../middleware/auth';
import { validate, createPaymentSchema, verifyPaymentSchema } from '../middleware/zodValidation';
import {
  validatePagination,
  validateObjectId,
} from '../middleware/validation';

const router = express.Router();

// All payment routes require authentication
router.use(authenticate);

// User routes
// User routes
// User routes
router.post('/create', requireUser, validate(createPaymentSchema), createPayment);
router.post('/verify', requireUser, validate(verifyPaymentSchema), verifyPayment);

router.get('/my-payments', requireUser, validatePagination, getUserPayments);
router.get('/invoice/:invoiceId/download', requireUser, validateObjectId('invoiceId'), downloadInvoice);

// ✅ STATS MUST BE ABOVE :paymentId
router.get('/stats', requireUser, getPaymentStats);

// dispute
router.patch('/:paymentId/dispute', requireUser, validateObjectId('paymentId'), markPaymentDisputed);

// Admin
router.post('/:paymentId/refund', requireAdmin, validateObjectId('paymentId'), refundPayment);
router.post('/:paymentId/resend-receipt', requireAdmin, validateObjectId('paymentId'), resendReceipt);

// ✅ KEEP THIS LAST ALWAYS
router.get('/:paymentId', requireUser, validateObjectId('paymentId'), getPaymentDetails);

export default router;