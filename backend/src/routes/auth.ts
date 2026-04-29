
// src/routes/auth.ts
import express from 'express';
import {
  register,
  login,
  resendVerificationOTP,
  verifyTwoFactor,
  requestPasswordReset,
  resetPassword,
  getProfile,
  updateProfile,
  changePassword,
  toggleTwoFactor,
  logout,
  verifyEmail
} from '../controllers/authController';

import { authenticate, refreshToken } from '../middleware/auth';
import { validate, registerSchema, loginSchema } from '../middleware/zodValidation';
import {
  validateEmailOnly,
  validateEmailOTP,
  validateNewPassword,
  validateProfileUpdate,
  validateTwoFactorOTP,
} from '../middleware/validation'; // Temporary until fully Zod converted

const router = express.Router();

// -----------------------------
// Public routes
// -----------------------------
router.post('/register', validate(registerSchema), register);
router.post('/verify-email', validateEmailOTP, verifyEmail);
router.post('/resend-verification', validateEmailOnly, resendVerificationOTP);
router.post('/login', validate(loginSchema), login);
router.post('/verify-2fa', validateTwoFactorOTP, verifyTwoFactor);
router.post('/request-password-reset', validateEmailOnly, requestPasswordReset);
router.post('/reset-password', validateNewPassword, resetPassword);
router.post('/refresh-token', refreshToken);

// -----------------------------
// Protected routes (authenticated)
// -----------------------------
router.use(authenticate); // All routes below require authentication

router.get('/profile', getProfile);
router.put('/profile', validateProfileUpdate, updateProfile);
router.post('/change-password', changePassword);
router.post('/toggle-2fa', toggleTwoFactor);
router.post('/logout', logout);

export default router;



// import express from 'express';
// import {
//   register,
//   login,
//   resendVerificationOTP,
//   verifyTwoFactor,
//   requestPasswordReset,
//   resetPassword,
//   getProfile,
//   updateProfile,
//   changePassword,
//   toggleTwoFactor,
//   logout,
//   verifyEmail
// } from '../controllers/authController';

// import { authenticate, refreshToken } from '../middleware/auth';
// import {
//   validate,
//   registerSchema,
//   loginSchema,
//   // ... other Zod schemas will be imported here
// } from '../middleware/zodValidation';
// import {
//   validateOTP,
//   validatePasswordReset,
//   validateNewPassword,
//   validateProfileUpdate,
// } from '../middleware/validation'; // Keep for now until all are converted

// const router = express.Router();

// // Public routes
// router.post('/register', validate(registerSchema), register);
// router.post('/verify-email', validateOTP, verifyEmail);
// router.post('/resend-verification', validatePasswordReset, resendVerificationOTP);
// router.post('/login', validate(loginSchema), login);
// router.post('/verify-2fa', validateOTP, verifyTwoFactor);
// router.post('/request-password-reset', validatePasswordReset, requestPasswordReset);
// router.post('/reset-password', validateNewPassword, resetPassword);
// router.post('/refresh-token', refreshToken);

// // Protected routes
// router.use(authenticate); // All routes below require authentication

// router.get('/profile', getProfile);
// router.put('/profile', validateProfileUpdate, updateProfile);
// router.post('/change-password', changePassword);
// router.post('/toggle-2fa', toggleTwoFactor);
// router.post('/logout', logout);

// export default router;
