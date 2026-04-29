import mongoose, { Schema, Model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions, Secret } from 'jsonwebtoken';
import { IUser } from '../types';

// -----------------------------
// Sub-schemas
// -----------------------------
const addressSchema = new Schema({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  country: { type: String, required: true },
  zipCode: { type: String, required: true },
}, { _id: false });

const preferencesSchema = new Schema({
  notifications: { type: Boolean, default: true },
  newsletter: { type: Boolean, default: false },
  twoFactorAuth: { type: Boolean, default: false },
}, { _id: false });

// -----------------------------
// User schema
// -----------------------------
interface IUserModel extends Model<IUser> {
  findByEmailWithPassword(email: string): Promise<IUser | null>;
}

const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 8, select: false },
  firstName: { type: String, required: true, trim: true, maxlength: 50 },
  lastName: { type: String, required: true, trim: true, maxlength: 50 },
  role: { type: String, enum: ['user', 'admin', 'superadmin'], default: 'user' },
  permissions: [{ type: String }],
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  isEmailVerified: { type: Boolean, default: false },
  region: { type: String, required: true, enum: ['North America','South America','Europe','Asia','Africa','Australia','Antarctica'] },
  language: { type: String, required: true, enum: ['en','es','fr','de','it','pt','ru','zh','ja','ko','ar','hi'], default: 'en' },
  avatar: { type: String, default: null },
  phone: { type: String, trim: true, match: [/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number'] },
  address: { type: addressSchema, default: null },
  preferences: { type: preferencesSchema, default: () => ({}) },
  lastLogin: { type: Date, default: null },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_, ret: Partial<IUser> & { __v?: number }) => {
      if ('password' in ret) delete ret.password;
      if ('__v' in ret) delete ret.__v;
      return ret;
    },
  },
  toObject: {
    virtuals: true,
    transform: (_, ret: Partial<IUser> & { __v?: number }) => {
      if ('password' in ret) delete ret.password;
      if ('__v' in ret) delete ret.__v;
      return ret;
    },
  },
});

// -----------------------------
// Pre-save hook: hash password
// -----------------------------
userSchema.pre<IUser>('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
    this.password = await bcrypt.hash(this.password, saltRounds);
    this.failedLoginAttempts = 0;
    this.lockUntil = undefined;
    next();
  } catch (err) {
    next(err as Error);
  }
});

// -----------------------------
// Instance methods
// -----------------------------
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
userSchema.methods.generateAuthToken = function (): string {
  const payload = { userId: this._id.toString(), email: this.email, role: this.role };
  const secret: string = process.env.JWT_SECRET ?? 'fallback_secret';

  const expires: string = process.env.JWT_EXPIRE ?? '15m';
  const options: SignOptions = {
    issuer: 'mern-app',
    audience: 'mern-app-users',
    expiresIn: expires as `${number}${"s" | "m" | "h" | "d"}`, // explicit cast
  };

  return jwt.sign(payload, secret, options);
};

// Generate refresh token
userSchema.methods.generateRefreshToken = function (): string {
  const payload = { userId: this._id.toString(), email: this.email, role: this.role };
  const secret: string = process.env.JWT_REFRESH_SECRET ?? 'fallback_refresh_secret';

  const expires: string = process.env.JWT_REFRESH_EXPIRE ?? '7d';
  const options: SignOptions = {
    issuer: 'mern-app',
    audience: 'mern-app-users',
    expiresIn: expires as `${number}${"s" | "m" | "h" | "d"}`, // explicit cast
  };

  return jwt.sign(payload, secret, options);
};

// Static methods
// -----------------------------
userSchema.statics.findByEmailWithPassword = function(email: string): Promise<IUser | null> {
  return this.findOne({ email }).select('+password').exec();
};

// -----------------------------
// Virtuals
// -----------------------------
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// -----------------------------
// Model export
// -----------------------------
const User: IUserModel = mongoose.model<IUser, IUserModel>('User', userSchema);
export default User;
