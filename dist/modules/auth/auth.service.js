"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.resetPassword = exports.verifyResetOtp = exports.forgotPassword = exports.logout = exports.refreshToken = exports.resendOtp = exports.verifyEmail = exports.loginUser = exports.registerUser = void 0;
const user_model_1 = require("../user/user.model");
const apiError_1 = require("../../shared/utils/apiError");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../../config");
const emailHelper_1 = require("../../shared/utils/emailHelper");
const logger_1 = require("../../shared/utils/logger");
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();
const OTP_RESEND_COOLDOWN_SEC = 60;
const registerUser = async (payload) => {
    const existing = await user_model_1.User.findOne({ email: payload.email });
    if (existing)
        throw new apiError_1.AppError(400, 'Email already formally tied to system');
    const passwordHash = await bcrypt_1.default.hash(payload.password, 12);
    const otp = generateOtp();
    const hashedOtp = await bcrypt_1.default.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const user = await user_model_1.User.create({
        ...payload,
        passwordHash,
        verificationOtp: hashedOtp,
        verificationOtpExpiresAt: expiresAt,
        lastOtpSentAt: new Date()
    });
    await (0, emailHelper_1.sendEmail)(user.email, 'Verify your email', `<p>Your verification OTP is <b>${otp}</b>. It expires in 10 minutes.</p>`);
    logger_1.authLogger.info('User registration successful', { email: user.email });
    return user;
};
exports.registerUser = registerUser;
const loginUser = async (payload) => {
    const user = await user_model_1.User.findOne({ email: payload.email }).select('+passwordHash');
    if (!user || user.status === 'blocked') {
        logger_1.authLogger.warn('Failed login attempt - User not found or blocked', { email: payload.email });
        throw new apiError_1.AppError(401, 'Credentials completely unverified or structurally blocked');
    }
    // Safety: Enforce email verification at login
    if (!user.isEmailVerified) {
        logger_1.authLogger.warn('Failed login attempt - Email not verified', { userId: user._id });
        throw new apiError_1.AppError(403, 'Email not verified. Please verify your email before logging in.');
    }
    const isMatch = await bcrypt_1.default.compare(payload.password, user.passwordHash);
    if (!isMatch) {
        logger_1.authLogger.warn('Failed login attempt - Password mismatch', { userId: user._id });
        throw new apiError_1.AppError(401, 'Credentials completely unverified');
    }
    const accessToken = jsonwebtoken_1.default.sign({ userId: user._id, globalRole: user.globalRole }, config_1.config.jwt.accessSecret, { expiresIn: config_1.config.jwt.accessEpiresIn });
    const refreshToken = jsonwebtoken_1.default.sign({ userId: user._id, globalRole: user.globalRole }, config_1.config.jwt.refreshSecret, { expiresIn: config_1.config.jwt.refreshExpiresIn });
    // Persistence: Store hashed refresh token
    user.refreshTokenHash = await bcrypt_1.default.hash(refreshToken, 10);
    await user.save();
    logger_1.authLogger.info('User login successful', { userId: user._id });
    return { user, accessToken, refreshToken };
};
exports.loginUser = loginUser;
const verifyEmail = async (email, otp) => {
    const user = await user_model_1.User.findOne({ email }).select('+verificationOtp +verificationOtpExpiresAt');
    if (!user)
        throw new apiError_1.AppError(400, 'Invalid email mapping');
    if (!user.verificationOtp || !user.verificationOtpExpiresAt)
        throw new apiError_1.AppError(400, 'No pending verification found');
    if (user.verificationOtpExpiresAt < new Date())
        throw new apiError_1.AppError(400, 'OTP expired');
    const isMatch = await bcrypt_1.default.compare(otp, user.verificationOtp);
    if (!isMatch)
        throw new apiError_1.AppError(400, 'Invalid OTP provided precisely');
    user.isEmailVerified = true;
    user.verificationOtp = undefined;
    user.verificationOtpExpiresAt = undefined;
    await user.save();
    logger_1.authLogger.info('User email verified', { userId: user._id });
    return user;
};
exports.verifyEmail = verifyEmail;
const resendOtp = async (email) => {
    const user = await user_model_1.User.findOne({ email }).select('+verificationOtp +verificationOtpExpiresAt +lastOtpSentAt');
    if (!user)
        throw new apiError_1.AppError(404, 'User not found');
    if (user.isEmailVerified)
        throw new apiError_1.AppError(400, 'Email is already verified');
    const now = new Date();
    if (user.lastOtpSentAt && (now.getTime() - user.lastOtpSentAt.getTime()) < OTP_RESEND_COOLDOWN_SEC * 1000) {
        throw new apiError_1.AppError(429, `Please wait ${OTP_RESEND_COOLDOWN_SEC} seconds before resending OTP exactly.`);
    }
    const otp = generateOtp();
    const hashedOtp = await bcrypt_1.default.hash(otp, 10);
    user.verificationOtp = hashedOtp;
    user.verificationOtpExpiresAt = new Date(now.getTime() + 10 * 60 * 1000);
    user.lastOtpSentAt = now;
    await user.save();
    await (0, emailHelper_1.sendEmail)(user.email, 'Verification OTP Resent', `<p>Your new verification OTP is <b>${otp}</b>.</p>`);
    logger_1.authLogger.info('Verification OTP resent', { userId: user._id });
};
exports.resendOtp = resendOtp;
const refreshToken = async (token) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.refreshSecret);
        const user = await user_model_1.User.findById(decoded.userId).select('+refreshTokenHash');
        if (!user || user.status === 'blocked' || !user.refreshTokenHash)
            throw new Error();
        // Strict Validation: Compare provided token with hashed storage
        const isMatch = await bcrypt_1.default.compare(token, user.refreshTokenHash);
        if (!isMatch) {
            logger_1.authLogger.error('Refresh token reuse or theft detected - Token hash mismatch', { userId: user._id });
            user.refreshTokenHash = undefined; // Invalidate all sessions as precaution
            await user.save();
            throw new Error();
        }
        const accessToken = jsonwebtoken_1.default.sign({ userId: user._id, globalRole: user.globalRole }, config_1.config.jwt.accessSecret, { expiresIn: config_1.config.jwt.accessEpiresIn });
        // Rotation: Issue and store new refresh token
        const newRefreshToken = jsonwebtoken_1.default.sign({ userId: user._id, globalRole: user.globalRole }, config_1.config.jwt.refreshSecret, { expiresIn: config_1.config.jwt.refreshExpiresIn });
        user.refreshTokenHash = await bcrypt_1.default.hash(newRefreshToken, 10);
        await user.save();
        return { accessToken, refreshToken: newRefreshToken };
    }
    catch (e) {
        logger_1.authLogger.error('Refresh token rotation failed', e);
        throw new apiError_1.AppError(401, 'Refresh token invalid or expired natively');
    }
};
exports.refreshToken = refreshToken;
const logout = async (userId) => {
    const user = await user_model_1.User.findById(userId);
    if (user) {
        user.refreshTokenHash = undefined;
        await user.save();
        logger_1.authLogger.info('User session invalidated on server', { userId });
    }
};
exports.logout = logout;
const forgotPassword = async (email) => {
    const user = await user_model_1.User.findOne({ email }).select('+lastOtpSentAt');
    if (!user)
        throw new apiError_1.AppError(404, 'User not found');
    const now = new Date();
    if (user.lastOtpSentAt && (now.getTime() - user.lastOtpSentAt.getTime()) < OTP_RESEND_COOLDOWN_SEC * 1000) {
        throw new apiError_1.AppError(429, `Please wait ${OTP_RESEND_COOLDOWN_SEC} seconds before requesting another reset OTP.`);
    }
    const otp = generateOtp();
    const hashedOtp = await bcrypt_1.default.hash(otp, 10);
    user.resetPasswordOtp = hashedOtp;
    user.resetPasswordOtpExpiresAt = new Date(now.getTime() + 15 * 60 * 1000);
    user.lastOtpSentAt = now;
    await user.save();
    await (0, emailHelper_1.sendEmail)(email, 'Password Reset OTP', `<p>Your reset OTP is <b>${otp}</b>. It expires in 15 minutes.</p>`);
    logger_1.authLogger.info('Forgot password requested', { email });
};
exports.forgotPassword = forgotPassword;
const verifyResetOtp = async (email, otp) => {
    const user = await user_model_1.User.findOne({ email }).select('+resetPasswordOtp +resetPasswordOtpExpiresAt');
    if (!user)
        throw new apiError_1.AppError(400, 'Invalid email mapping');
    if (!user.resetPasswordOtp || !user.resetPasswordOtpExpiresAt)
        throw new apiError_1.AppError(400, 'No pending reset found');
    if (user.resetPasswordOtpExpiresAt < new Date())
        throw new apiError_1.AppError(400, 'OTP expired');
    const isMatch = await bcrypt_1.default.compare(otp, user.resetPasswordOtp);
    if (!isMatch)
        throw new apiError_1.AppError(400, 'Invalid OTP provided precisely');
    return true;
};
exports.verifyResetOtp = verifyResetOtp;
const resetPassword = async (payload) => {
    const user = await user_model_1.User.findOne({ email: payload.email }).select('+resetPasswordOtp +resetPasswordOtpExpiresAt');
    if (!user)
        throw new apiError_1.AppError(400, 'Invalid email');
    if (!user.resetPasswordOtp || !user.resetPasswordOtpExpiresAt)
        throw new apiError_1.AppError(400, 'No pending reset found');
    if (user.resetPasswordOtpExpiresAt < new Date())
        throw new apiError_1.AppError(400, 'OTP expired');
    const isMatch = await bcrypt_1.default.compare(payload.otp, user.resetPasswordOtp);
    if (!isMatch)
        throw new apiError_1.AppError(400, 'Invalid OTP');
    user.passwordHash = await bcrypt_1.default.hash(payload.newPassword, 12);
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpiresAt = undefined;
    user.refreshTokenHash = undefined; // Invalidate all sessions on password reset
    await user.save();
    logger_1.authLogger.info('Password reset successful', { userId: user._id });
};
exports.resetPassword = resetPassword;
const changePassword = async (userId, oldPass, newPass) => {
    const user = await user_model_1.User.findById(userId).select('+passwordHash');
    if (!user)
        throw new apiError_1.AppError(404, 'User not found');
    const isMatch = await bcrypt_1.default.compare(oldPass, user.passwordHash);
    if (!isMatch)
        throw new apiError_1.AppError(401, 'Current password incorrect');
    user.passwordHash = await bcrypt_1.default.hash(newPass, 12);
    user.refreshTokenHash = undefined; // Invalidate all sessions on password change
    await user.save();
    logger_1.authLogger.info('Password changed via profile', { userId });
};
exports.changePassword = changePassword;
