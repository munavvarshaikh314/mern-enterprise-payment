import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { AuthenticatedRequest, JWTPayload, ApiResponse } from '../types';

const accessCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'none' as const,
  maxAge: 15 * 60 * 1000,
};

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'none' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const getBearerToken = (req: Request): string | null => {
  if (!req.header('Authorization')?.startsWith('Bearer ')) {
    return null;
  }

  return req.header('Authorization')!.substring(7);
};

// Middleware to authenticate JWT token
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check for token in cookies first, then Authorization header
    const token = req.cookies.accessToken || getBearerToken(req);
    
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      } as ApiResponse);
      return;
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'fallback_secret'
      ) as JWTPayload;

      // Find user and attach to request
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Invalid token. User not found.',
        } as ApiResponse);
        return;
      }

      // Check if user is active/verified if needed
      if (!user.isEmailVerified) {
        res.status(401).json({
          success: false,
          message: 'Please verify your email address to continue.',
        } as ApiResponse);
        return;
      }

      req.user = user;
      next();
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          message: 'Token expired. Please login again.',
        } as ApiResponse);
        return;
      }
      
      if (jwtError instanceof jwt.JsonWebTokenError) {
        res.status(401).json({
          success: false,
          message: 'Invalid token.',
        } as ApiResponse);
        return;
      }
      
      throw jwtError;
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.',
    } as ApiResponse);
  }
};

// Middleware to check if user has admin role
export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required.',
    } as ApiResponse);
    return;
  }

  if (!['admin', 'superadmin'].includes(req.user.role)) {
    res.status(403).json({
      success: false,
      message: 'Admin access required.',
    } as ApiResponse);
    return;
  }

  next();
};

// Middleware to check for specific permissions
export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      } as ApiResponse);
      return;
    }

    if (['admin', 'superadmin'].includes(req.user.role)) {
      next();
      return;
    }

    if (!req.user.permissions?.includes(permission)) {
      res.status(403).json({
        success: false,
        message: `Permission required: ${permission}`,
      } as ApiResponse);
      return;
    }

    next();
  };
};

// Middleware to check if user has user role or higher
export const requireUser = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required.',
    } as ApiResponse);
    return;
  }

  if (!['user', 'admin', 'superadmin'].includes(req.user.role)) {
    res.status(403).json({
      success: false,
      message: 'User access required.',
    } as ApiResponse);
    return;
  }

  next();
};

// Middleware to check if user owns the resource or is admin
export const requireOwnershipOrAdmin = (resourceUserIdField: string = 'userId') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      } as ApiResponse);
      return;
    }

    // Admin can access any resource
    if (req.user.role === 'admin') {
      next();
      return;
    }

    // Check ownership
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    if (!resourceUserId) {
      res.status(400).json({
        success: false,
        message: 'Resource user ID not provided.',
      } as ApiResponse);
      return;
    }

    if (req.user._id.toString() !== resourceUserId) {
      res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.',
      } as ApiResponse);
      return;
    }

    next();
  };
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.cookies.accessToken || getBearerToken(req);
    
    if (!token) {
      next();
      return;
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'fallback_secret'
      ) as JWTPayload;

      const user = await User.findById(decoded.userId);
      
      if (user && user.isEmailVerified) {
        req.user = user;
      }
    } catch (jwtError) {
      // Silently ignore JWT errors for optional auth
    }

    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    next(); // Continue without authentication
  }
};

// Middleware to refresh JWT token
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: 'Refresh token is required.',
      } as ApiResponse);
      return;
    }

    try {
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret'
      ) as JWTPayload;

      const user = await User.findById(decoded.userId);
      
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Invalid refresh token. User not found.',
        } as ApiResponse);
        return;
      }

      // Generate new tokens
      const newAccessToken = user.generateAuthToken();
      const newRefreshToken = user.generateRefreshToken();

      res.cookie('accessToken', newAccessToken, accessCookieOptions);
      res.cookie('refreshToken', newRefreshToken, refreshCookieOptions);

      res.json({
        success: true,
        message: 'Tokens refreshed successfully.',
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
          },
        },
      } as ApiResponse);
    } catch (jwtError) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token.',
      } as ApiResponse);
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during token refresh.',
    } as ApiResponse);
  }
};
