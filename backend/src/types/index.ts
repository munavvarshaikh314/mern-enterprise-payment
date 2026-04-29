
import { Request } from 'express';
import { Document, Types } from 'mongoose';

// User related types
export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin' | 'superadmin';
  permissions?: string[];
  failedLoginAttempts?: number;
  lockUntil?: Date;
  isEmailVerified: boolean;
  region: 'North America' | 'South America' | 'Europe' | 'Asia' | 'Africa' | 'Australia' | 'Antarctica';
  language: 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ru' | 'zh' | 'ja' | 'ko' | 'ar' | 'hi';
  avatar?: string | null;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  } | null;
  preferences: {
    notifications: boolean;
    newsletter: boolean;
    twoFactorAuth: boolean;
  };
  lastLogin?: Date | null;
  createdAt: Date;
  updatedAt: Date;

  comparePassword(candidatePassword: string): Promise<boolean>;
  generateAuthToken(): string;
  generateRefreshToken(): string;
}


// OTP related types
export interface IOTP extends Document {
  userId: Types.ObjectId;
  email: string;
  otp: string;
  type: 'email_verification' | 'password_reset' | 'two_factor';
  expiresAt: Date;
  isUsed: boolean;
  attempts: number;
  createdAt: Date;
}

// Payment related types
export interface IPayment extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  amount: number;
  currency: string;
  status: 'created' | 'pending' | 'completed' | 'failed' | 'refunded';
  description: string;
  metadata?: Record<string, any>;
  invoiceUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  isDisputed?: boolean;
}

// Invoice related types
export interface IInvoice extends Document {
  _id: Types.ObjectId;
  paymentId: Types.ObjectId;
  userId: Types.ObjectId;
  invoiceNumber: string;
  amount: number;
  currency: string;
  items: Array<{
    name: string;
    description?: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  tax?: {
    rate: number;
    amount: number;
  };
  discount?: {
    type: 'percentage' | 'fixed';
    value: number;
    amount: number;
  };
  billingAddress: {
    name: string;
    email: string;
    phone?: string;
    address: {
      street: string;
      city: string;
      state: string;
      country: string;
      zipCode: string;
    };
  };
  pdfPath?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Analytics related types
export interface IAnalytics {
  totalUsers: number;
  totalRevenue: number;
  totalPayments: number;
  regionStats: Array<{
    region: string;
    userCount: number;
    revenue: number;
  }>;
  topUsers: Array<{
    userId: Types.ObjectId;
    email: string;
    firstName: string;
    lastName: string;
    totalRevenue: number;
    totalPayments: number;
  }>;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    payments: number;
  }>;
}

// Request extensions
export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

// JWT Payload
export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Email types
export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Razorpay types
export interface RazorpayOrderOptions {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface RazorpayWebhookEvent {
  entity: string;
  account_id: string;
  event: string;
  contains: string[];
  payload: {
    payment: {
      entity: any;
    };
    order: {
      entity: any;
    };
  };
  created_at: number;
}

// Validation schemas
export interface RegisterValidation {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  region: string;
  language: string;
}

export interface LoginValidation {
  email: string;
  password: string;
}

export interface PaymentValidation {
  amount: number;
  currency: string;
  description: string;
  items: Array<{
    name: string;
    description?: string;
    quantity: number;
    price: number;
  }>;
}

// Error types
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}



