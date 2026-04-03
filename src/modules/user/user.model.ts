import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  fullName: string;
  email: string;
  passwordHash: string;
  phone?: string;
  address?: string;
  bio?: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  status: 'active' | 'blocked';
  globalRole: 'user' | 'manager' | 'super_admin';
  verificationOtp?: string;
  verificationOtpExpiresAt?: Date;
  resetPasswordOtp?: string;
  resetPasswordOtpExpiresAt?: Date;
  lastOtpSentAt?: Date;
  refreshTokenHash?: string;
}

const userSchema = new Schema<IUser>({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true, select: false },
  phone: { type: String },
  address: { type: String },
  bio: { type: String },
  avatarUrl: { type: String },
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'blocked'], default: 'active' },
  globalRole: { type: String, enum: ['user', 'manager', 'super_admin'], default: 'user' },
  verificationOtp: { type: String, select: false },
  verificationOtpExpiresAt: { type: Date, select: false },
  resetPasswordOtp: { type: String, select: false },
  resetPasswordOtpExpiresAt: { type: Date, select: false },
  lastOtpSentAt: Date,
  refreshTokenHash: { type: String, select: false }
}, {
  timestamps: true,
  versionKey: false,
  toJSON: { 
    transform: (_, ret) => { 
      ret.id = ret._id; 
      delete (ret as any)._id; 
      delete (ret as any).passwordHash; 
      delete (ret as any).verificationOtp;
      delete (ret as any).resetPasswordOtp;
      return ret; 
    } 
  }
});

export const User = model<IUser>('User', userSchema);
