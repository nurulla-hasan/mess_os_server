import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  fullName: string;
  email: string;
  passwordHash: string;
  phone?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  status: 'active' | 'blocked';
  globalRole: 'user' | 'super_admin';
  verificationOtp?: string;
  verificationOtpExpiresAt?: Date;
  resetPasswordOtp?: string;
  resetPasswordOtpExpiresAt?: Date;
}

const userSchema = new Schema<IUser>({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true, select: false },
  phone: { type: String },
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'blocked'], default: 'active' },
  globalRole: { type: String, enum: ['user', 'super_admin'], default: 'user' },
  verificationOtp: String,
  verificationOtpExpiresAt: Date,
  resetPasswordOtp: String,
  resetPasswordOtpExpiresAt: Date
}, {
  timestamps: true,
  versionKey: false,
  toJSON: { transform: (_, ret) => { ret.id = ret._id; delete (ret as any)._id; delete (ret as any).passwordHash; return ret; } }
});

export const User = model<IUser>('User', userSchema);
