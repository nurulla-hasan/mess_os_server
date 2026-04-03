import { User } from '../user/user.model';
import { AppError } from '../../shared/utils/apiError';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { sendEmail } from '../../shared/utils/emailHelper';
import { authLogger } from '../../shared/utils/logger';

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();
const OTP_RESEND_COOLDOWN_SEC = 60;

export const registerUser = async (payload: any) => {
  const existing = await User.findOne({ email: payload.email });
  if (existing) throw new AppError(400, 'Email already formally tied to system');
  
  const passwordHash = await bcrypt.hash(payload.password, 12);
  const otp = generateOtp();
  const hashedOtp = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); 

  const user = await User.create({ 
    ...payload, 
    passwordHash, 
    verificationOtp: hashedOtp, 
    verificationOtpExpiresAt: expiresAt,
    lastOtpSentAt: new Date()
  });

  await sendEmail(user.email, 'Verify your email', `<p>Your verification OTP is <b>${otp}</b>. It expires in 10 minutes.</p>`);
  authLogger.info('User registration successful', { email: user.email });
  
  return user;
};

export const loginUser = async (payload: any) => {
  const user = await User.findOne({ email: payload.email }).select('+passwordHash');
  if (!user || user.status === 'blocked') {
    authLogger.warn('Failed login attempt - User not found or blocked', { email: payload.email });
    throw new AppError(401, 'Credentials completely unverified or structurally blocked');
  }

  // Safety: Enforce email verification at login
  if (!user.isEmailVerified) {
     authLogger.warn('Failed login attempt - Email not verified', { userId: user._id });
     throw new AppError(403, 'Email not verified. Please verify your email before logging in.');
  }
  
  const isMatch = await bcrypt.compare(payload.password, user.passwordHash);
  if (!isMatch) {
    authLogger.warn('Failed login attempt - Password mismatch', { userId: user._id });
    throw new AppError(401, 'Credentials completely unverified');
  }

  const accessToken = jwt.sign(
    { userId: user._id, globalRole: user.globalRole }, 
    (config.jwt.accessSecret as string), 
    { expiresIn: (config.jwt.accessEpiresIn as any) }
  );

  const refreshToken = jwt.sign(
    { userId: user._id, globalRole: user.globalRole }, 
    (config.jwt.refreshSecret as string), 
    { expiresIn: (config.jwt.refreshExpiresIn as any) }
  );

  // Persistence: Store hashed refresh token
  user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  await user.save();

  authLogger.info('User login successful', { userId: user._id });
  return { user, accessToken, refreshToken };
};

export const verifyEmail = async (email: string, otp: string) => {
    const user = await User.findOne({ email }).select('+verificationOtp +verificationOtpExpiresAt');
    if (!user) throw new AppError(400, 'Invalid email mapping');
    if (!user.verificationOtp || !user.verificationOtpExpiresAt) throw new AppError(400, 'No pending verification found');
    if (user.verificationOtpExpiresAt < new Date()) throw new AppError(400, 'OTP expired');

    const isMatch = await bcrypt.compare(otp, user.verificationOtp);
    if (!isMatch) throw new AppError(400, 'Invalid OTP provided precisely');

    user.isEmailVerified = true;
    user.verificationOtp = undefined;
    user.verificationOtpExpiresAt = undefined;
    await user.save();

    authLogger.info('User email verified', { userId: user._id });
    return user;
};

export const resendOtp = async (email: string) => {
    const user = await User.findOne({ email }).select('+verificationOtp +verificationOtpExpiresAt +lastOtpSentAt');
    if (!user) throw new AppError(404, 'User not found');
    if (user.isEmailVerified) throw new AppError(400, 'Email is already verified');

    const now = new Date();
    if (user.lastOtpSentAt && (now.getTime() - user.lastOtpSentAt.getTime()) < OTP_RESEND_COOLDOWN_SEC * 1000) {
        throw new AppError(429, `Please wait ${OTP_RESEND_COOLDOWN_SEC} seconds before resending OTP exactly.`);
    }
    
    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);
    user.verificationOtp = hashedOtp;
    user.verificationOtpExpiresAt = new Date(now.getTime() + 10 * 60 * 1000);
    user.lastOtpSentAt = now;
    await user.save();

    await sendEmail(user.email, 'Verification OTP Resent', `<p>Your new verification OTP is <b>${otp}</b>.</p>`);
    authLogger.info('Verification OTP resent', { userId: user._id });
};

export const refreshToken = async (token: string) => {
    try {
        const decoded = jwt.verify(token, config.jwt.refreshSecret) as any;
        const user = await User.findById(decoded.userId).select('+refreshTokenHash');
        if (!user || user.status === 'blocked' || !user.refreshTokenHash) throw new Error();

        // Strict Validation: Compare provided token with hashed storage
        const isMatch = await bcrypt.compare(token, user.refreshTokenHash);
        if (!isMatch) {
             authLogger.error('Refresh token reuse or theft detected - Token hash mismatch', { userId: user._id });
             user.refreshTokenHash = undefined; // Invalidate all sessions as precaution
             await user.save();
             throw new Error();
        }

        const accessToken = jwt.sign(
            { userId: user._id, globalRole: user.globalRole }, 
            (config.jwt.accessSecret as string), 
            { expiresIn: (config.jwt.accessEpiresIn as any) }
        );

        // Rotation: Issue and store new refresh token
        const newRefreshToken = jwt.sign(
            { userId: user._id, globalRole: user.globalRole }, 
            (config.jwt.refreshSecret as string), 
            { expiresIn: (config.jwt.refreshExpiresIn as any) }
        );

        user.refreshTokenHash = await bcrypt.hash(newRefreshToken, 10);
        await user.save();

        return { accessToken, refreshToken: newRefreshToken };
    } catch (e) {
        authLogger.error('Refresh token rotation failed', e);
        throw new AppError(401, 'Refresh token invalid or expired natively');
    }
};

export const logout = async (userId: string) => {
    const user = await User.findById(userId);
    if (user) {
        user.refreshTokenHash = undefined;
        await user.save();
        authLogger.info('User session invalidated on server', { userId });
    }
};

export const forgotPassword = async (email: string) => {
    const user = await User.findOne({ email }).select('+lastOtpSentAt');
    if (!user) throw new AppError(404, 'User not found');

    const now = new Date();
    if (user.lastOtpSentAt && (now.getTime() - user.lastOtpSentAt.getTime()) < OTP_RESEND_COOLDOWN_SEC * 1000) {
        throw new AppError(429, `Please wait ${OTP_RESEND_COOLDOWN_SEC} seconds before requesting another reset OTP.`);
    }

    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);
    user.resetPasswordOtp = hashedOtp;
    user.resetPasswordOtpExpiresAt = new Date(now.getTime() + 15 * 60 * 1000);
    user.lastOtpSentAt = now;
    await user.save();

    await sendEmail(email, 'Password Reset OTP', `<p>Your reset OTP is <b>${otp}</b>. It expires in 15 minutes.</p>`);
    authLogger.info('Forgot password requested', { email });
};

export const verifyResetOtp = async (email: string, otp: string) => {
    const user = await User.findOne({ email }).select('+resetPasswordOtp +resetPasswordOtpExpiresAt');
    if (!user) throw new AppError(400, 'Invalid email mapping');
    if (!user.resetPasswordOtp || !user.resetPasswordOtpExpiresAt) throw new AppError(400, 'No pending reset found');
    if (user.resetPasswordOtpExpiresAt < new Date()) throw new AppError(400, 'OTP expired');

    const isMatch = await bcrypt.compare(otp, user.resetPasswordOtp);
    if (!isMatch) throw new AppError(400, 'Invalid OTP provided precisely');
    
    return true;
};

export const resetPassword = async (payload: any) => {
    const user = await User.findOne({ email: payload.email }).select('+resetPasswordOtp +resetPasswordOtpExpiresAt');
    if (!user) throw new AppError(400, 'Invalid email');
    if (!user.resetPasswordOtp || !user.resetPasswordOtpExpiresAt) throw new AppError(400, 'No pending reset found');
    if (user.resetPasswordOtpExpiresAt < new Date()) throw new AppError(400, 'OTP expired');

    const isMatch = await bcrypt.compare(payload.otp, user.resetPasswordOtp);
    if (!isMatch) throw new AppError(400, 'Invalid OTP');

    user.passwordHash = await bcrypt.hash(payload.newPassword, 12);
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpiresAt = undefined;
    user.refreshTokenHash = undefined; // Invalidate all sessions on password reset
    await user.save();

    authLogger.info('Password reset successful', { userId: user._id });
};

export const changePassword = async (userId: string, oldPass: string, newPass: string) => {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) throw new AppError(404, 'User not found');

    const isMatch = await bcrypt.compare(oldPass, user.passwordHash);
    if (!isMatch) throw new AppError(401, 'Current password incorrect');

    user.passwordHash = await bcrypt.hash(newPass, 12);
    user.refreshTokenHash = undefined; // Invalidate all sessions on password change
    await user.save();
    
    authLogger.info('Password changed via profile', { userId });
};
