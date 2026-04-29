import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';

export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const error = {
    message: `Route ${req.originalUrl} not found`,
    statusCode: 404,
    isOperational: true,
  };

  res.status(404).json({
    success: false,
    message: `Not Found - ${req.originalUrl}`,
    error: `The requested route ${req.method} ${req.originalUrl} does not exist on this server.`,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
  } as ApiResponse);
};

