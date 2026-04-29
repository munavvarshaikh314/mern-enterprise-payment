// src/controllers/authController.ts
import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { AuthenticatedRequest } from '../types';
import User from '../models/User';
import OTP from '../models/OTP';
import emailService from '../services/emailService';
import { createSuccessResponse, createErrorResponse } from '../utils/response';

const accessCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 15 * 60 * 1000,
};

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const toPublicUser = (user: any) => ({
  id: user._id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  role: user.role,
  region: user.region,
  language: user.language,
  isEmailVerified: user.isEmailVerified,
  preferences: user.preferences,
  createdAt: user.createdAt,
  lastLogin: user.lastLogin,
});

const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  res.cookie('accessToken', accessToken, accessCookieOptions);
  res.cookie('refreshToken', refreshToken, refreshCookieOptions);
};


// -----------------------------
// Register User
// -----------------------------
export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password, firstName, lastName, region, language } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(400).json(createErrorResponse('User already exists with this email'));
    return;
  }

  const user = new User({ email, password, firstName, lastName, region, language });
  await user.save();

  const otpDoc = await OTP.createOTP(user._id.toString(), email, 'email_verification');
  await emailService.sendOTPEmail(email, otpDoc.otp, 'email_verification');

  res.status(201).json(
    createSuccessResponse(
      'User registered successfully. Please check your email for verification code.',
      {
        userId: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isEmailVerified: user.isEmailVerified,
      }
    )
  );
});

// -----------------------------
// Verify Email
// -----------------------------
export const verifyEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    res.status(404).json(createErrorResponse('User not found'));
    return;
  }
  if (user.isEmailVerified) {
    res.status(400).json(createErrorResponse('Email is already verified'));
    return;
  }

  const verification = await OTP.verifyOTP(user._id.toString(), otp, 'email_verification');
  if (!verification.success) {
    res.status(400).json(createErrorResponse(verification.message));
    return;
  }

  user.isEmailVerified = true;
  await user.save();

  await emailService.sendWelcomeEmail(user.email, user.firstName);

  const accessToken = user.generateAuthToken();
  const refreshToken = user.generateRefreshToken();
  setAuthCookies(res, accessToken, refreshToken);

  res.json(
    createSuccessResponse('Email verified successfully', {
      accessToken,
      refreshToken,
      user: toPublicUser(user),
    })
  );
});

// -----------------------------
// Login User
// -----------------------------
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findByEmailWithPassword(email);
  if (!user) {
    res.status(401).json(createErrorResponse('Invalid email or password'));
    return;
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    res.status(401).json(createErrorResponse('Invalid email or password'));
    return;
  }

  if (!user.isEmailVerified) {
    res.status(401).json(createErrorResponse('Please verify your email address first'));
    return;
  }

  const requiresTwoFactor = user.preferences?.twoFactorAuth === true;

  if (requiresTwoFactor) {
    const otpDoc = await OTP.createOTP(user._id.toString(), user.email, 'two_factor');
    const emailSent = await emailService.sendOTPEmail(user.email, otpDoc.otp, 'two_factor');

    if (!emailSent) {
      res.status(500).json(createErrorResponse('Failed to send two-factor authentication code'));
      return;
    }

    res.json(
      createSuccessResponse('Two-factor authentication required', {
        requiresTwoFactor: true,
        userId: user._id,
        user: toPublicUser(user),
      })
    );
    return;
  }

  user.lastLogin = new Date();
  await user.save();

  const accessToken = user.generateAuthToken();
  const refreshToken = user.generateRefreshToken();
  setAuthCookies(res, accessToken, refreshToken);

  res.json(
    createSuccessResponse('Login successful', {
      accessToken,
      refreshToken,
      user: toPublicUser(user),
      requiresTwoFactor: false,
    })
  );
});
// -----------------------------
// Resend Verification OTP
// -----------------------------
export const resendVerificationOTP = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    res.status(404).json(createErrorResponse('User not found'));
    return;
  }

  if (user.isEmailVerified) {
    res.status(400).json(createErrorResponse('Email is already verified'));
    return;
  }

  const otpDoc = await OTP.createOTP(user._id.toString(), email, 'email_verification');
  const emailSent = await emailService.sendOTPEmail(email, otpDoc.otp, 'email_verification');
  if (!emailSent) {
    res.status(500).json(createErrorResponse('Failed to send verification email'));
    return;
  }

  res.json(createSuccessResponse('Verification code sent successfully'));
});

// -----------------------------
// Verify Two-Factor Authentication
// -----------------------------
export const verifyTwoFactor = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { userId, otp } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    res.status(404).json(createErrorResponse('User not found'));
    return;
  }

  const verification = await OTP.verifyOTP(userId, otp, 'two_factor');
  if (!verification.success) {
    res.status(400).json(createErrorResponse(verification.message));
    return;
  }

  user.lastLogin = new Date();
  await user.save();

  const accessToken = user.generateAuthToken();
  const refreshToken = user.generateRefreshToken();
  setAuthCookies(res, accessToken, refreshToken);

  res.json(
    createSuccessResponse('Two-factor authentication successful', {
      accessToken,
      refreshToken,
      user: toPublicUser(user),
    })
  );
});

// -----------------------------
// Request Password Reset
// -----------------------------
export const requestPasswordReset = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (user) {
    const otpDoc = await OTP.createOTP(user._id.toString(), email, 'password_reset');
    await emailService.sendPasswordResetEmail(email, otpDoc.otp);
  }

  // Always respond success to avoid leaking info
  res.json(createSuccessResponse('If an account with this email exists, a password reset code has been sent.'));
});

// -----------------------------
// Reset Password
// -----------------------------
export const resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, otp, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    res.status(404).json(createErrorResponse('User not found'));
    return;
  }

  const verification = await OTP.verifyOTP(user._id.toString(), otp, 'password_reset');
  if (!verification.success) {
    res.status(400).json(createErrorResponse(verification.message));
    return;
  }

  user.password = password;
  await user.save();

  res.json(createSuccessResponse('Password reset successfully'));
});

// -----------------------------
// Get Profile
// -----------------------------
export const getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json(createErrorResponse('User not authenticated'));
    return;
  }

  res.json(createSuccessResponse('Profile retrieved successfully', { user: req.user }));
});

// -----------------------------
// Update Profile
// -----------------------------
export const updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json(createErrorResponse('User not authenticated'));
    return;
  }

  Object.assign(req.user, req.body);
  await req.user.save();

  res.json(createSuccessResponse('Profile updated successfully', { user: req.user }));
});

// -----------------------------
// Change Password
// -----------------------------
export const changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;

  if (!req.user) {
    res.status(401).json(createErrorResponse('User not authenticated'));
    return;
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    res.status(404).json(createErrorResponse('User not found'));
    return;
  }

  const valid = await user.comparePassword(currentPassword);
  if (!valid) {
    res.status(400).json(createErrorResponse('Current password is incorrect'));
    return;
  }

  user.password = newPassword;
  await user.save();

  res.json(createSuccessResponse('Password changed successfully'));
});

// -----------------------------
// Toggle Two-Factor Authentication
// -----------------------------
export const toggleTwoFactor = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { enabled } = req.body;

  if (!req.user) {
    res.status(401).json(createErrorResponse('User not authenticated'));
    return;
  }

  req.user.preferences.twoFactorAuth = enabled;
  await req.user.save();

  res.json(createSuccessResponse(`Two-factor authentication ${enabled ? 'enabled' : 'disabled'} successfully`, { twoFactorAuth: req.user.preferences.twoFactorAuth }));
});

// -----------------------------
// Logout
// -----------------------------
export const logout = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.json(createSuccessResponse('Logged out successfully'));
});


// import { Request, Response } from 'express';
// import asyncHandler from 'express-async-handler';
// import { AuthenticatedRequest } from '../types';
// import User from '../models/User';
// import OTP from '../models/OTP';
// import emailService from '../services/emailService';
// import { createSuccessResponse, createErrorResponse } from '../utils/response';

// // -----------------------------
// // Register User
// // -----------------------------
// export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
//   const { email, password, firstName, lastName, region, language } = req.body;

//   const existingUser = await User.findOne({ email });
//   if (existingUser) {
//     res.status(400).json(createErrorResponse('User already exists with this email'));
//     return;
//   }

//   const user = new User({ email, password, firstName, lastName, region, language });
//   await user.save();

//   const otpDoc = await OTP.createOTP(user._id.toString(), email, 'email_verification');
//   await emailService.sendOTPEmail(email, otpDoc.otp, 'email_verification');

//   res.status(201).json(createSuccessResponse('User registered successfully. Please check your email for verification code.', {
//     userId: user._id,
//     email: user.email,
//     firstName: user.firstName,
//     lastName: user.lastName,
//     isEmailVerified: user.isEmailVerified,
//   }));
// });

// // -----------------------------
// // Verify Email
// // -----------------------------
// export const verifyEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
//   const { email, otp } = req.body;

//   const user = await User.findOne({ email });
//   if (!user) return res.status(404).json(createErrorResponse('User not found'));
//   if (user.isEmailVerified) return res.status(400).json(createErrorResponse('Email is already verified'));

//   const verification = await OTP.verifyOTP(user._id.toString(), otp, 'email_verification');
//   if (!verification.success) return res.status(400).json(createErrorResponse(verification.message));

//   user.isEmailVerified = true;
//   await user.save();

//   await emailService.sendWelcomeEmail(user.email, user.firstName);

//   const accessToken = user.generateAuthToken();
//   const refreshToken = user.generateRefreshToken();

//   res.cookie('accessToken', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 15 * 60 * 1000 });
//   res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });

//   res.json(createSuccessResponse('Email verified successfully', {
//     accessToken,
//     refreshToken,
//     user: {
//       id: user._id,
//       email: user.email,
//       firstName: user.firstName,
//       lastName: user.lastName,
//       role: user.role,
//       region: user.region,
//       language: user.language,
//       isEmailVerified: user.isEmailVerified,
//     },
//   }));
// });

// // -----------------------------
// // Login User
// // -----------------------------
// export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
//   const { email, password } = req.body;
//   const user = await User.findByEmailWithPassword(email);
//   if (!user) return res.status(401).json(createErrorResponse('Invalid email or password'));

//   const isPasswordValid = await user.comparePassword(password);
//   if (!isPasswordValid) return res.status(401).json(createErrorResponse('Invalid email or password'));
//   if (!user.isEmailVerified) return res.status(401).json(createErrorResponse('Please verify your email address first'));

//   const accessToken = user.generateAuthToken();
//   const refreshToken = user.generateRefreshToken();

//   res.cookie('accessToken', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 15 * 60 * 1000 });
//   res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });

//   res.json(createSuccessResponse('Login successful', { accessToken, refreshToken, user }));
// });

// // -----------------------------
// // Resend Verification OTP
// // -----------------------------
// export const resendVerificationOTP = asyncHandler(async (req: Request, res: Response): Promise<void> => {
//   const { email } = req.body;
//   const user = await User.findOne({ email });
//   if (!user) return res.status(404).json(createErrorResponse('User not found'));
//   if (user.isEmailVerified) return res.status(400).json(createErrorResponse('Email is already verified'));

//   const otpDoc = await OTP.createOTP(user._id.toString(), email, 'email_verification');
//   const emailSent = await emailService.sendOTPEmail(email, otpDoc.otp, 'email_verification');
//   if (!emailSent) return res.status(500).json(createErrorResponse('Failed to send verification email'));

//   res.json(createSuccessResponse('Verification code sent successfully'));
// });

// // -----------------------------
// // Verify Two-Factor Authentication
// // -----------------------------
// export const verifyTwoFactor = asyncHandler(async (req: Request, res: Response): Promise<void> => {
//   const { userId, otp } = req.body;
//   const user = await User.findById(userId);
//   if (!user) return res.status(404).json(createErrorResponse('User not found'));

//   const verification = await OTP.verifyOTP(userId, otp, 'two_factor');
//   if (!verification.success) return res.status(400).json(createErrorResponse(verification.message));

//   user.lastLogin = new Date();
//   await user.save();

//   const accessToken = user.generateAuthToken();
//   const refreshToken = user.generateRefreshToken();

//   res.json(createSuccessResponse('Two-factor authentication successful', { accessToken, refreshToken, user }));
// });

// // -----------------------------
// // Request Password Reset
// // -----------------------------
// export const requestPasswordReset = asyncHandler(async (req: Request, res: Response): Promise<void> => {
//   const { email } = req.body;
//   const user = await User.findOne({ email });
//   if (!user) return res.json(createSuccessResponse('If an account with this email exists, a password reset code has been sent.'));

//   const otpDoc = await OTP.createOTP(user._id.toString(), email, 'password_reset');
//   await emailService.sendPasswordResetEmail(email, otpDoc.otp);

//   res.json(createSuccessResponse('If an account with this email exists, a password reset code has been sent.'));
// });

// // -----------------------------
// // Reset Password
// // -----------------------------
// export const resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
//   const { email, otp, password } = req.body;
//   const user = await User.findOne({ email });
//   if (!user) return res.status(404).json(createErrorResponse('User not found'));

//   const verification = await OTP.verifyOTP(user._id.toString(), otp, 'password_reset');
//   if (!verification.success) return res.status(400).json(createErrorResponse(verification.message));

//   user.password = password;
//   await user.save();

//   res.json(createSuccessResponse('Password reset successfully'));
// });

// // -----------------------------
// // Get Profile
// // -----------------------------
// export const getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
//   const user = req.user!;
//   res.json(createSuccessResponse('Profile retrieved successfully', { user }));
// });

// // -----------------------------
// // Update Profile
// // -----------------------------
// export const updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
//   const user = req.user!;
//   Object.assign(user, req.body); // simple merge for update
//   await user.save();
//   res.json(createSuccessResponse('Profile updated successfully', { user }));
// });

// // -----------------------------
// // Change Password
// // -----------------------------
// export const changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
//   const { currentPassword, newPassword } = req.body;
//   const user = await User.findById(req.user!._id).select('+password');
//   if (!user) return res.status(404).json(createErrorResponse('User not found'));

//   const valid = await user.comparePassword(currentPassword);
//   if (!valid) return res.status(400).json(createErrorResponse('Current password is incorrect'));

//   user.password = newPassword;
//   await user.save();

//   res.json(createSuccessResponse('Password changed successfully'));
// });

// // -----------------------------
// // Toggle Two-Factor Authentication
// // -----------------------------
// export const toggleTwoFactor = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
//   const { enabled } = req.body;
//   const user = req.user!;
//   user.preferences.twoFactorAuth = enabled;
//   await user.save();
//   res.json(createSuccessResponse(`Two-factor authentication ${enabled ? 'enabled' : 'disabled'} successfully`, { twoFactorAuth: user.preferences.twoFactorAuth }));
// });

// // -----------------------------
// // Logout
// // -----------------------------
// export const logout = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
//   res.clearCookie('accessToken');
//   res.clearCookie('refreshToken');
//   res.json(createSuccessResponse('Logged out successfully'));
// });
