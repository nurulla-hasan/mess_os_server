import { User } from '../user/user.model';
import { AppError } from '../../shared/utils/apiError';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { sendEmail } from '../../shared/utils/emailHelper';
import { createOtpEmailTemplate } from '../../shared/utils/emailTemplates';
import { authLogger } from '../../shared/utils/logger';
import crypto from 'crypto';
import { RegisterPayload, LoginPayload, ResetPasswordPayload } from './auth.validation';
import { MessMember } from '../mess-member/mess-member.model';

const generateOtp = () => crypto.randomInt(100000, 999999).toString();
const OTP_RESEND_COOLDOWN_SEC = 60;

const getUserMemberships = async (userId: string) => {
  return MessMember.find({ userId })
    .populate('messId', 'name address status suspensionNote suspendedAt suspendedBy')
    .lean();
};

export const registerUser = async (payload: RegisterPayload) => {
  const existing = await User.findOne({ email: payload.email });
  if (existing) throw new AppError(400, 'Email already used!');
  
  const passwordHash = await bcrypt.hash(payload.password, 12);
  const otp = generateOtp();
  const hashedOtp = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); 

  const user = await User.create({ 
    ...payload, 
    passwordHash, 
    verificationOtp: hashedOtp, 
    verificationOtpExpiresAt: expiresAt,
    lastVerificationOtpSentAt: new Date()
  });

  try {
    await sendEmail(
      user.email,
      'Verify your Mess OS email',
      createOtpEmailTemplate({
        title: 'Verify your email',
        preheader: 'Use this OTP to verify your Mess OS account.',
        intro: 'Welcome to Mess OS. Use the verification code below to activate your account and start managing your mess securely.',
        otp,
        expiresIn: '10 minutes',
      })
    );
    authLogger.info('User registration successful', { email: user.email });
  } catch (error) {
    await User.findByIdAndDelete(user._id);
    authLogger.error('Failed to send verification email, deleted user', { email: user.email, error });
    throw new AppError(500, 'Failed to send verification email. Please try registering again.');
  }
  
  return user;
};

export const loginUser = async (payload: LoginPayload) => {
  const user = await User.findOne({ email: payload.email }).select('+passwordHash');
  if (!user) {
    authLogger.warn('Failed login attempt - User not found', { email: payload.email });
    throw new AppError(401, 'Invalid email or password');
  }

  if (!user.isEmailVerified) {
     authLogger.warn('Failed login attempt - Email not verified', { userId: user._id });
     throw new AppError(403, 'Email not verified. Please verify your email before logging in.');
  }
  
  const isMatch = await bcrypt.compare(payload.password, user.passwordHash);
  if (!isMatch) {
    authLogger.warn('Failed login attempt - Password mismatch', { userId: user._id });
    throw new AppError(401, 'Invalid email or password');
  }

  const accessToken = jwt.sign(
    { userId: user._id, globalRole: user.globalRole }, 
    (config.jwt.accessSecret as string), 
    { expiresIn: config.jwt.accessExpiresIn as jwt.SignOptions['expiresIn'] }
  );

  const refreshToken = jwt.sign(
    { userId: user._id, globalRole: user.globalRole }, 
    (config.jwt.refreshSecret as string), 
    { expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'] }
  );

  user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  await user.save();

  const memberships = await getUserMemberships(String(user._id));
  const userData = { ...user.toJSON(), memberships };

  authLogger.info('User login successful', { userId: user._id });
  return { user: userData, accessToken, refreshToken };
};

export const verifyEmail = async (email: string, otp: string) => {
    const user = await User.findOne({ email }).select('+verificationOtp +verificationOtpExpiresAt');
    if (!user) throw new AppError(400, 'Invalid email mapping');
    if (!user.verificationOtp || !user.verificationOtpExpiresAt) throw new AppError(400, 'No pending verification found');
    if (user.verificationOtpExpiresAt < new Date()) throw new AppError(400, 'OTP expired');

    const isMatch = await bcrypt.compare(otp, user.verificationOtp);
    if (!isMatch) throw new AppError(400, 'Invalid OTP');

    user.isEmailVerified = true;
    user.verificationOtp = undefined;
    user.verificationOtpExpiresAt = undefined;
    await user.save();

    authLogger.info('User email verified', { userId: user._id });
    return user;
};

export const resendOtp = async (email: string) => {
    const user = await User.findOne({ email }).select('+verificationOtp +verificationOtpExpiresAt +lastVerificationOtpSentAt');
    if (!user) throw new AppError(404, 'User not found');
    if (user.isEmailVerified) throw new AppError(400, 'Email is already verified');

    const now = new Date();
    if (user.lastVerificationOtpSentAt && (now.getTime() - user.lastVerificationOtpSentAt.getTime()) < OTP_RESEND_COOLDOWN_SEC * 1000) {
        throw new AppError(429, `Please wait ${OTP_RESEND_COOLDOWN_SEC} seconds before resending OTP.`);
    }
    
    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);
    
    const oldOtp = user.verificationOtp;
    const oldExpiresAt = user.verificationOtpExpiresAt;
    const oldSentAt = user.lastVerificationOtpSentAt;

    user.verificationOtp = hashedOtp;
    user.verificationOtpExpiresAt = new Date(now.getTime() + 10 * 60 * 1000);
    user.lastVerificationOtpSentAt = now;
    await user.save();

    try {
      await sendEmail(
        user.email,
        'Your new Mess OS verification OTP',
        createOtpEmailTemplate({
          title: 'New verification OTP',
          preheader: 'Use this new OTP to verify your Mess OS account.',
          intro: 'You requested a new verification code. Use the OTP below to complete your email verification.',
          otp,
          expiresIn: '10 minutes',
        })
      );
      authLogger.info('Verification OTP resent', { userId: user._id });
    } catch (e) {
      user.verificationOtp = oldOtp;
      user.verificationOtpExpiresAt = oldExpiresAt;
      user.lastVerificationOtpSentAt = oldSentAt;
      await user.save();
      throw new AppError(500, 'Failed to send OTP email. Please try again later.');
    }
};

export const refreshToken = async (token: string) => {
    try {
        const decoded = jwt.verify(token, config.jwt.refreshSecret) as jwt.JwtPayload;
        const user = await User.findById(decoded.userId).select('+refreshTokenHash');
        if (!user || user.status === 'blocked' || !user.refreshTokenHash) throw new Error();

        const isMatch = await bcrypt.compare(token, user.refreshTokenHash);
        if (!isMatch) {
             authLogger.error('Refresh token reuse or theft detected - Token hash mismatch', { userId: user._id });
             user.refreshTokenHash = undefined; 
             await user.save();
             throw new Error();
        }

        const accessToken = jwt.sign(
            { userId: user._id, globalRole: user.globalRole }, 
            (config.jwt.accessSecret as string), 
            { expiresIn: config.jwt.accessExpiresIn as jwt.SignOptions['expiresIn'] }
        );

        const newRefreshToken = jwt.sign(
            { userId: user._id, globalRole: user.globalRole }, 
            (config.jwt.refreshSecret as string), 
            { expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'] }
        );

        user.refreshTokenHash = await bcrypt.hash(newRefreshToken, 10);
        await user.save();

        return { accessToken, refreshToken: newRefreshToken };
    } catch (e) {
        authLogger.error('Refresh token rotation failed', e);
        throw new AppError(401, 'Refresh token is invalid or expired');
    }
};

export const logout = async (token?: string) => {
    if (!token) return;
    try {
        const decoded = jwt.verify(token, config.jwt.refreshSecret) as jwt.JwtPayload;
        const user = await User.findById(decoded.userId).select('+refreshTokenHash');
        if (user) {
            user.refreshTokenHash = undefined;
            await user.save();
            authLogger.info('Server session invalidated via refresh token explicitly during logout', { userId: user._id });
        }
    } catch (e: unknown) {
        if (e instanceof Error) {
            authLogger.warn('Server session invalidation failure during logout (token expired or corrupted)', { error: e.message });
        }
    }
};

export const forgotPassword = async (email: string) => {
    const user = await User.findOne({ email }).select('+lastResetOtpSentAt');
    if (!user) throw new AppError(404, 'User not found');

    const now = new Date();
    if (user.lastResetOtpSentAt && (now.getTime() - user.lastResetOtpSentAt.getTime()) < OTP_RESEND_COOLDOWN_SEC * 1000) {
        throw new AppError(429, `Please wait ${OTP_RESEND_COOLDOWN_SEC} seconds before requesting another reset OTP.`);
    }

    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);
    
    const oldOtp = user.resetPasswordOtp;
    const oldExpiresAt = user.resetPasswordOtpExpiresAt;
    const oldSentAt = user.lastResetOtpSentAt;

    user.resetPasswordOtp = hashedOtp;
    user.resetPasswordOtpExpiresAt = new Date(now.getTime() + 15 * 60 * 1000);
    user.lastResetOtpSentAt = now;
    await user.save();

    try {
      await sendEmail(
        email,
        'Reset your Mess OS password',
        createOtpEmailTemplate({
          title: 'Reset your password',
          preheader: 'Use this OTP to reset your Mess OS password.',
          intro: 'We received a request to reset your password. Use the OTP below to continue with password reset.',
          otp,
          expiresIn: '15 minutes',
          note: 'If this was not you, do not share this code. Your current password will remain unchanged.',
        })
      );
      authLogger.info('Forgot password requested', { email });
    } catch (e) {
      user.resetPasswordOtp = oldOtp;
      user.resetPasswordOtpExpiresAt = oldExpiresAt;
      user.lastResetOtpSentAt = oldSentAt;
      await user.save();
      throw new AppError(500, 'Failed to send reset OTP email. Please try again later.');
    }
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

export const resetPassword = async (payload: ResetPasswordPayload) => {
    const user = await User.findOne({ email: payload.email }).select('+resetPasswordOtp +resetPasswordOtpExpiresAt');
    if (!user) throw new AppError(400, 'Invalid email');
    if (!user.resetPasswordOtp || !user.resetPasswordOtpExpiresAt) throw new AppError(400, 'No pending reset found');
    if (user.resetPasswordOtpExpiresAt < new Date()) throw new AppError(400, 'OTP expired');

    const isMatch = await bcrypt.compare(payload.otp, user.resetPasswordOtp);
    if (!isMatch) throw new AppError(400, 'Invalid OTP');

    user.passwordHash = await bcrypt.hash(payload.newPassword, 12);
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpiresAt = undefined;
    user.refreshTokenHash = undefined; 
    await user.save();

    authLogger.info('Password reset successful', { userId: user._id });
};

export const changePassword = async (userId: string, oldPass: string, newPass: string) => {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) throw new AppError(404, 'User not found');

    const isMatch = await bcrypt.compare(oldPass, user.passwordHash);
    if (!isMatch) throw new AppError(401, 'Current password incorrect');

    user.passwordHash = await bcrypt.hash(newPass, 12);
    user.refreshTokenHash = undefined; 
    await user.save();
    
    authLogger.info('Password changed via profile', { userId });
};
