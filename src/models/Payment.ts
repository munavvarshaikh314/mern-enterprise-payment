// src/models/Payment.ts
import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { IPayment } from '../types';
import { Transaction } from './postgres/Transaction';

export interface IPaymentDocument extends IPayment, Document {}

interface IPaymentModel extends Model<IPayment> {
  getUserStats(userId: string): Promise<{
    totalPayments: number;
    totalAmount: number;
    avgAmount: number;
    lastPayment: Date | null;
  }>;
  getRevenueByRegion(): Promise<any>;
  getTopUsersByRevenue(limit?: number): Promise<any>;
  getMonthlyRevenue(months?: number): Promise<any>;
}

const paymentSchema = new Schema<IPaymentDocument, IPaymentModel>({
  userId: {
    type: Schema.Types.ObjectId,
    required: [true, 'User ID is required'],
    ref: 'User',
  },
  razorpayOrderId: {
    type: String,
    required: [true, 'Razorpay Order ID is required'],
    unique: true,
  },
  razorpayPaymentId: {
    type: String,
    default: null,
  },
  razorpaySignature: {
    type: String,
    default: null,
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [1, 'Amount must be greater than 0'],
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    enum: ['INR', 'USD', 'EUR', 'GBP'],
    default: 'INR',
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: ['created', 'pending', 'completed', 'failed', 'refunded'],
    default: 'created',
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [255, 'Description cannot exceed 255 characters'],
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
  
  isDisputed: {
  type: Boolean,
  default: false,
},

  invoiceUrl: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

// Indexes
paymentSchema.index({ userId: 1 });
paymentSchema.index({ razorpayPaymentId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ userId: 1, status: 1 });
paymentSchema.index({ userId: 1, createdAt: -1 });

// ====== Static methods ======
paymentSchema.statics.getUserStats = async function(userId: string) {
  const stats = await this.aggregate([
    { $match: { userId: new Types.ObjectId(userId), status: 'completed' } },
    {
      $group: {
        _id: null,
        totalPayments: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        avgAmount: { $avg: '$amount' },
        lastPayment: { $max: '$createdAt' },
      },
    },
  ]);

  return stats[0] || {
    totalPayments: 0,
    totalAmount: 0,
    avgAmount: 0,
    lastPayment: null,
  };
};

paymentSchema.statics.getRevenueByRegion = async function() {
  return await this.aggregate([
    { $match: { status: 'completed' } },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $group: {
        _id: '$user.region',
        totalRevenue: { $sum: '$amount' },
        totalPayments: { $sum: 1 },
        avgAmount: { $avg: '$amount' },
      },
    },
    {
      $project: {
        region: '$_id',
        totalRevenue: 1,
        totalPayments: 1,
        avgAmount: { $round: ['$avgAmount', 2] },
        _id: 0,
      },
    },
    { $sort: { totalRevenue: -1 } },
  ]);
};

paymentSchema.statics.getTopUsersByRevenue = async function(limit: number = 5) {
  return await this.aggregate([
    { $match: { status: 'completed' } },
    {
      $group: {
        _id: '$userId',
        totalRevenue: { $sum: '$amount' },
        totalPayments: { $sum: 1 },
        lastPayment: { $max: '$createdAt' },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $project: {
        userId: '$_id',
        email: '$user.email',
        firstName: '$user.firstName',
        lastName: '$user.lastName',
        region: '$user.region',
        totalRevenue: 1,
        totalPayments: 1,
        lastPayment: 1,
        _id: 0,
      },
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: limit },
  ]);
};

paymentSchema.statics.getMonthlyRevenue = async function(months: number = 12) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  return await this.aggregate([
    {
      $match: {
        status: 'completed',
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        revenue: { $sum: '$amount' },
        payments: { $sum: 1 },
      },
    },
    {
      $project: {
        month: {
          $concat: [
            { $toString: '$_id.year' },
            '-',
            {
              $cond: {
                if: { $lt: ['$_id.month', 10] },
                then: { $concat: ['0', { $toString: '$_id.month' }] },
                else: { $toString: '$_id.month' },
              },
            },
          ],
        },
        revenue: 1,
        payments: 1,
        _id: 0,
      },
    },
    { $sort: { month: 1 } },
  ]);
};

// ====== Instance methods ======
paymentSchema.methods.isSuccessful = function(): boolean {
  return this.status === 'completed' && this.razorpayPaymentId && this.razorpaySignature;
};

paymentSchema.methods.getAgeInDays = function(): number {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - this.createdAt.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Pre-save middleware
paymentSchema.pre('save', function(next) {
  if (this.status === 'completed' && (!this.razorpayPaymentId || !this.razorpaySignature)) {
    return next(new Error('Payment ID and signature are required for completed payments'));
  }

  if (this.currency === 'INR' && this.amount < 100) {
    return next(new Error('Minimum amount for INR is 100 paise (1 rupee)'));
  }

  next();
});

const Payment = mongoose.model<IPayment, IPaymentModel>('Payment', paymentSchema);
export default Payment;
