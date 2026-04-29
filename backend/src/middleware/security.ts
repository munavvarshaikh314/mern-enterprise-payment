import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import {body, validationResult, FieldValidationError } from 'express-validator';

import xss from 'xss';
import DOMPurify from 'isomorphic-dompurify';
import { RequestHandler } from 'express';


// Rate limiting middleware
export const createRateLimit = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: message || 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        message: 'Rate limit exceeded',
        retryAfter: Math.round(windowMs / 1000),
      });
    },
  });
};

// Speed limiting middleware
export const createSpeedLimit = (
  windowMs: number,
  delayAfter: number,
  delayMs: number
): RequestHandler => {
  return slowDown({
    windowMs,
    delayAfter,
    delayMs,
    maxDelayMs: delayMs * 10,
  });
};


// Common rate limits
export const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Too many authentication attempts, please try again later.'
);

export const apiRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests
  'Too many API requests, please try again later.'
);

export const paymentRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  10, // 10 payment attempts
  'Too many payment attempts, please try again later.'
);

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return xss(DOMPurify.sanitize(obj));
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');
  
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://api.razorpay.com; " +
    "frame-src https://api.razorpay.com; " +
    "object-src 'none'; " +
    "base-uri 'self';"
  );
  
  // Strict-Transport-Security
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  next();
};

// Request size limiting
export const requestSizeLimit = (maxSize: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = req.get('content-length');
    if (contentLength) {
      const sizeInBytes = parseInt(contentLength);
      const maxSizeInBytes = parseSize(maxSize);
      
      if (sizeInBytes > maxSizeInBytes) {
        res.status(413).json({
          success: false,
          message: 'Request entity too large',
        });
        return;
      }
    }
    next();
  };
};

// Helper function to parse size strings
const parseSize = (size: string): number => {
  const units: { [key: string]: number } = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };
  
  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';
  
  return value * units[unit];
};

// IP whitelist middleware
export const createIPWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    
    if (allowedIPs.includes('*') || allowedIPs.includes(clientIP || '')) {
      next();
      return;
    }
    
    res.status(403).json({
      success: false,
      message: 'Access denied from this IP address',
    });
  };
};

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const originalSend = res.send;
  
  res.send = function(body) {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    };
    
    // Log to console (in production, use proper logging service)
    console.log(JSON.stringify(logData));
    
    return originalSend.call(this, body);
  };
  
  next();
};

// Validation error handler
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) : void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((error) => {
        if ('param' in error) {
          return {
            field: error.param,
            message: error.msg,
            value: (error as FieldValidationError).value,
          };
        }
        return {
          message: error.msg,
        };
      }),
    });
    return;
  }
  next();
};


// Common validation rules
export const emailValidation = body('email')
  .isEmail()
  .normalizeEmail()
  .withMessage('Please provide a valid email address');

export const passwordValidation = body('password')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters long')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');

export const nameValidation = (field: string) => 
  body(field)
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage(`${field} must be between 1 and 50 characters`)
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage(`${field} must contain only letters and spaces`);

export const otpValidation = body('otp')
  .isLength({ min: 6, max: 6 })
  .withMessage('OTP must be exactly 6 digits')
  .isNumeric()
  .withMessage('OTP must contain only numbers');

export const amountValidation = body('amount')
  .isInt({ min: 100 }) // Minimum 1 INR (100 paise)
  .withMessage('Amount must be at least 100 paise (1 INR)');

export const regionValidation = body('region')
  .isIn(['North America', 'South America', 'Europe', 'Asia', 'Africa', 'Australia', 'Antarctica'])
  .withMessage('Please select a valid region');

export const languageValidation = body('language')
  .isIn(['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi'])
  .withMessage('Please select a valid language');

// MongoDB injection prevention
export const preventNoSQLInjection = (req: Request, res: Response, next: NextFunction) => {
  const checkForInjection = (obj: any): boolean => {
    if (typeof obj === 'string') {
      return /^\$/.test(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.some(checkForInjection);
    }
    
    if (obj && typeof obj === 'object') {
      return Object.keys(obj).some(key => 
        key.startsWith('$') || checkForInjection(obj[key])
      );
    }
    
    return false;
  };

  if (checkForInjection(req.body) || checkForInjection(req.query) || checkForInjection(req.params)) {
    res.status(400).json({
      success: false,
      message: 'Invalid request format',
    });
    return;
  }

  next();
};

// CSRF protection for state-changing operations
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }

  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    res.status(403).json({
      success: false,
      message: 'Invalid CSRF token',
    });
    return;
  }

  next();
};

export default {
  createRateLimit,
  createSpeedLimit,
  authRateLimit,
  apiRateLimit,
  paymentRateLimit,
  sanitizeInput,
  securityHeaders,
  requestSizeLimit,
  createIPWhitelist,
  requestLogger,
  handleValidationErrors,
  emailValidation,
  passwordValidation,
  nameValidation,
  otpValidation,
  amountValidation,
  regionValidation,
  languageValidation,
  preventNoSQLInjection,
  csrfProtection,
};

