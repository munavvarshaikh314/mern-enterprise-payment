import { Request, Response, NextFunction } from 'express';
import { ApiResponse, AppError } from '../types';

// Custom error class for operational errors
export class OperationalError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.name = 'OperationalError';

    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handler middleware
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let err = { ...error };
  err.message = error.message;

  // Log error
  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
  });

  // Mongoose bad ObjectId
  if (error.name === 'CastError') {
    const message = 'Invalid resource ID format';
    err = new OperationalError(message, 400);
  }

  // Mongoose duplicate key
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    err = new OperationalError(message, 400);
  }

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map((val: any) => ({
      field: val.path,
      message: val.message,
    }));
    
    res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors,
    } as ApiResponse);
    return;
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    err = new OperationalError(message, 401);
  }

  if (error.name === 'TokenExpiredError') {
    const message = 'Token expired';
    err = new OperationalError(message, 401);
  }

  // Multer errors (file upload)
  if (error.code === 'LIMIT_FILE_SIZE') {
    const message = 'File size too large';
    err = new OperationalError(message, 400);
  }

  if (error.code === 'LIMIT_FILE_COUNT') {
    const message = 'Too many files';
    err = new OperationalError(message, 400);
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = 'Unexpected file field';
    err = new OperationalError(message, 400);
  }

  // Rate limiting errors
  if (error.type === 'entity.too.large') {
    const message = 'Request entity too large';
    err = new OperationalError(message, 413);
  }

  // Default to 500 server error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  const response: ApiResponse = {
    success: false,
    message,
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.error = error.stack;
  }

  // Add error details for operational errors
  if (err.isOperational || error instanceof OperationalError || error instanceof AppError) {
    response.error = message;
  } else {
    // For programming errors, don't leak error details in production
    if (process.env.NODE_ENV === 'production') {
      response.message = 'Something went wrong';
    }
  }

  res.status(statusCode).json(response);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const error = new OperationalError(`Not found - ${req.originalUrl}`, 404);
  next(error);
};

// Validation error formatter
export const formatValidationErrors = (errors: any[]): Array<{ field: string; message: string }> => {
  return errors.map(error => ({
    field: error.path || error.param || 'unknown',
    message: error.msg || error.message || 'Invalid value',
  }));
};

// Create standardized error responses
export const createErrorResponse = (
  message: string,
  statusCode: number = 500,
  errors?: Array<{ field: string; message: string }>
): ApiResponse => {
  const response: ApiResponse = {
    success: false,
    message,
  };

  if (errors && errors.length > 0) {
    response.errors = errors;
  }

  return response;
};

// Create standardized success responses
export const createSuccessResponse = (
  message: string,
  data?: any
): ApiResponse => {
  const response: ApiResponse = {
    success: true,
    message,
  };

  if (data !== undefined) {
    response.data = data;
  }

  return response;
};

