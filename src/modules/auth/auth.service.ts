import { User } from '../user/user.model';
import { AppError } from '../../shared/utils/apiError';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { sendEmail } from '../../shared/utils/emailHelper';

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

export const registerUser = async (payload: any) => {
  const existing = await User.findOne({ email: payload.email });
  if (existing) throw new AppError(400, 'Email already formally tied to system');
  
  const passwordHash = await bcrypt.hash(payload.password, 12);
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

  const user = await User.create({ 
    ...payload, 
    passwordHash, 
    verificationOtp: otp, 
    verificationOtpExpiresAt: expiresAt 
  });

  await sendEmail(user.email, 'Verify your email', `<p>Your verification OTP is <b>${otp}</b>. It expires in 10 minutes.</p>`);
  
  return user;
};

export const loginUser = async (payload: any) => {
  const user = await User.findOne({ email: payload.email }).select('+passwordHash');
  if (!user || user.status === 'blocked') throw new AppError(401, 'Credentials completely unverified or structurally blocked');
  
  const isMatch = await bcrypt.compare(payload.password, user.passwordHash);
  if (!isMatch) throw new AppError(401, 'Credentials completely unverified');

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

  return { user, accessToken, refreshToken };
};

export const verifyEmail = async (email: string, otp: string) => {
    const user = await User.findOne({ email, verificationOtp: otp });
    if (!user) throw new AppError(400, 'Invalid OTP or email mapping');
    if (user.verificationOtpExpiresAt && user.verificationOtpExpiresAt < new Date()) throw new AppError(400, 'OTP expired');

    user.isEmailVerified = true;
    user.verificationOtp = undefined;
    user.verificationOtpExpiresAt = undefined;
    await user.save();
    return user;
};

export const resendOtp = async (email: string) => {
    const user = await User.findOne({ email });
    if (!user) throw new AppError(404, 'User not found');
    
    const otp = generateOtp();
    user.verificationOtp = otp;
    user.verificationOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendEmail(user.email, 'Verification OTP Resent', `<p>Your new verification OTP is <b>${otp}</b>.</p>`);
};

export const refreshToken = async (token: string) => {
    try {
        const decoded = jwt.verify(token, config.jwt.refreshSecret) as any;
        const user = await User.findById(decoded.userId);
        if (!user || user.status === 'blocked') throw new Error();

        const accessToken = jwt.sign(
            { userId: user._id, globalRole: user.globalRole }, 
            (config.jwt.accessSecret as string), 
            { expiresIn: (config.jwt.accessEpiresIn as any) }
        );

        return { accessToken };
    } catch (e) {
        throw new AppError(401, 'Refresh token invalid or expired natively');
    }
};

export const forgotPassword = async (email: string) => {
    const user = await User.findOne({ email });
    if (!user) throw new AppError(404, 'User not found');

    const otp = generateOtp();
    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    await sendEmail(email, 'Password Reset OTP', `<p>Your reset OTP is <b>${otp}</b>. It expires in 15 minutes.</p>`);
};

export const verifyResetOtp = async (email: string, otp: string) => {
    const user = await User.findOne({ email, resetPasswordOtp: otp });
    if (!user) throw new AppError(400, 'Invalid OTP or email mapping');
    if (user.resetPasswordOtpExpiresAt && user.resetPasswordOtpExpiresAt < new Date()) throw new AppError(400, 'OTP expired');
    return true;
};

export const resetPassword = async (payload: any) => {
    const user = await User.findOne({ 
        email: payload.email, 
        resetPasswordOtp: payload.otp 
    });
    if (!user) throw new AppError(400, 'Invalid OTP or email');
    if (user.resetPasswordOtpExpiresAt && user.resetPasswordOtpExpiresAt < new Date()) throw new AppError(400, 'OTP expired');

    user.passwordHash = await bcrypt.hash(payload.newPassword, 12);
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpiresAt = undefined;
    await user.save();
};

export const changePassword = async (userId: string, oldPass: string, newPass: string) => {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) throw new AppError(404, 'User not found');

    const isMatch = await bcrypt.compare(oldPass, user.passwordHash);
    if (!isMatch) throw new AppError(401, 'Current password incorrect');

    user.passwordHash = await bcrypt.hash(newPass, 12);
    await user.save();
};
