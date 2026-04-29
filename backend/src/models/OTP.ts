// src/models/OTP.ts
import mongoose, { Schema, Model, Document, Types } from 'mongoose';
import { IOTP } from '../types';

interface IOTPModel extends Model<IOTP> {
  generateOTP(): string;
  createOTP(userId: string | Types.ObjectId, email: string, type: 'email_verification' | 'password_reset' | 'two_factor'): Promise<IOTP>;
  verifyOTP(userId: string | Types.ObjectId, otp: string, type: 'email_verification' | 'password_reset' | 'two_factor'): Promise<{ success: boolean; message: string }>;
  isValidOTP(userId: string | Types.ObjectId, type: 'email_verification' | 'password_reset' | 'two_factor'): Promise<boolean>;
}

const otpSchema = new Schema<IOTP, IOTPModel>({
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' }, // <-- fix here
  email: { type: String, required: true, lowercase: true, trim: true },
  otp: { type: String, required: true, minlength: 6, maxlength: 6 },
  type: { type: String, required: true, enum: ['email_verification', 'password_reset', 'two_factor'] },
  expiresAt: {
    type: Date,
    required: true,
    default: function () {
      const expireMinutes = parseInt(process.env.OTP_EXPIRE_MINUTES || '10');
      return new Date(Date.now() + expireMinutes * 60 * 1000);
    },
  },
  isUsed: { type: Boolean, default: false },
  attempts: { type: Number, default: 0, max: 5 },
}, { timestamps: true });

// Indexes
otpSchema.index({ userId: 1, type: 1 });
otpSchema.index({ email: 1, type: 1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// -----------------------------
// Statics
// -----------------------------
otpSchema.statics.generateOTP = function (): string {
  const length = parseInt(process.env.OTP_LENGTH || '6');
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) otp += digits[Math.floor(Math.random() * digits.length)];
  return otp;
};

otpSchema.statics.createOTP = async function (userId, email, type) {
  await this.deleteMany({ userId, type }); // delete old OTPs
  const otp = this.generateOTP();
  const expireMinutes = parseInt(process.env.OTP_EXPIRE_MINUTES || '10');
  const otpDoc = new this({
    userId,
    email,
    otp,
    type,
    expiresAt: new Date(Date.now() + expireMinutes * 60 * 1000),
  });
  await otpDoc.save();
  return otpDoc;
};

otpSchema.statics.verifyOTP = async function (userId, otp, type) {
  const otpDoc = await this.findOne({ userId, type, isUsed: false, expiresAt: { $gt: new Date() } });
  if (!otpDoc) return { success: false, message: 'Invalid or expired OTP' };

  otpDoc.attempts += 1;
  await otpDoc.save();

  if (otpDoc.attempts > 5) {
    await otpDoc.deleteOne();
    return { success: false, message: 'Maximum attempts exceeded. Request new OTP.' };
  }

  if (otpDoc.otp !== otp) return { success: false, message: 'Invalid OTP' };

  otpDoc.isUsed = true;
  await otpDoc.save();
  return { success: true, message: 'OTP verified successfully' };
};

otpSchema.statics.isValidOTP = async function (userId, type) {
  const otpDoc = await this.findOne({ userId, type, isUsed: false, expiresAt: { $gt: new Date() } });
  return !!otpDoc;
};

// -----------------------------
// Export
// -----------------------------
const OTP = mongoose.model<IOTP, IOTPModel>('OTP', otpSchema);
export default OTP;
