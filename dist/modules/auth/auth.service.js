"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.resetPassword = exports.verifyResetOtp = exports.forgotPassword = exports.refreshToken = exports.resendOtp = exports.verifyEmail = exports.loginUser = exports.registerUser = void 0;
const user_model_1 = require("../user/user.model");
const apiError_1 = require("../../shared/utils/apiError");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../../config");
const emailHelper_1 = require("../../shared/utils/emailHelper");
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();
const registerUser = async (payload) => {
    const existing = await user_model_1.User.findOne({ email: payload.email });
    if (existing)
        throw new apiError_1.AppError(400, 'Email already formally tied to system');
    const passwordHash = await bcrypt_1.default.hash(payload.password, 12);
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    const user = await user_model_1.User.create({
        ...payload,
        passwordHash,
        verificationOtp: otp,
        verificationOtpExpiresAt: expiresAt
    });
    await (0, emailHelper_1.sendEmail)(user.email, 'Verify your email', `<p>Your verification OTP is <b>${otp}</b>. It expires in 10 minutes.</p>`);
    return user;
};
exports.registerUser = registerUser;
const loginUser = async (payload) => {
    const user = await user_model_1.User.findOne({ email: payload.email }).select('+passwordHash');
    if (!user || user.status === 'blocked')
        throw new apiError_1.AppError(401, 'Credentials completely unverified or structurally blocked');
    const isMatch = await bcrypt_1.default.compare(payload.password, user.passwordHash);
    if (!isMatch)
        throw new apiError_1.AppError(401, 'Credentials completely unverified');
    const accessToken = jsonwebtoken_1.default.sign({ userId: user._id, globalRole: user.globalRole }, config_1.config.jwt.accessSecret, { expiresIn: config_1.config.jwt.accessEpiresIn });
    const refreshToken = jsonwebtoken_1.default.sign({ userId: user._id, globalRole: user.globalRole }, config_1.config.jwt.refreshSecret, { expiresIn: config_1.config.jwt.refreshExpiresIn });
    return { user, accessToken, refreshToken };
};
exports.loginUser = loginUser;
const verifyEmail = async (email, otp) => {
    const user = await user_model_1.User.findOne({ email, verificationOtp: otp });
    if (!user)
        throw new apiError_1.AppError(400, 'Invalid OTP or email mapping');
    if (user.verificationOtpExpiresAt && user.verificationOtpExpiresAt < new Date())
        throw new apiError_1.AppError(400, 'OTP expired');
    user.isEmailVerified = true;
    user.verificationOtp = undefined;
    user.verificationOtpExpiresAt = undefined;
    await user.save();
    return user;
};
exports.verifyEmail = verifyEmail;
const resendOtp = async (email) => {
    const user = await user_model_1.User.findOne({ email });
    if (!user)
        throw new apiError_1.AppError(404, 'User not found');
    const otp = generateOtp();
    user.verificationOtp = otp;
    user.verificationOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    await (0, emailHelper_1.sendEmail)(user.email, 'Verification OTP Resent', `<p>Your new verification OTP is <b>${otp}</b>.</p>`);
};
exports.resendOtp = resendOtp;
const refreshToken = async (token) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.refreshSecret);
        const user = await user_model_1.User.findById(decoded.userId);
        if (!user || user.status === 'blocked')
            throw new Error();
        const accessToken = jsonwebtoken_1.default.sign({ userId: user._id, globalRole: user.globalRole }, config_1.config.jwt.accessSecret, { expiresIn: config_1.config.jwt.accessEpiresIn });
        return { accessToken };
    }
    catch (e) {
        throw new apiError_1.AppError(401, 'Refresh token invalid or expired natively');
    }
};
exports.refreshToken = refreshToken;
const forgotPassword = async (email) => {
    const user = await user_model_1.User.findOne({ email });
    if (!user)
        throw new apiError_1.AppError(404, 'User not found');
    const otp = generateOtp();
    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();
    await (0, emailHelper_1.sendEmail)(email, 'Password Reset OTP', `<p>Your reset OTP is <b>${otp}</b>. It expires in 15 minutes.</p>`);
};
exports.forgotPassword = forgotPassword;
const verifyResetOtp = async (email, otp) => {
    const user = await user_model_1.User.findOne({ email, resetPasswordOtp: otp });
    if (!user)
        throw new apiError_1.AppError(400, 'Invalid OTP or email mapping');
    if (user.resetPasswordOtpExpiresAt && user.resetPasswordOtpExpiresAt < new Date())
        throw new apiError_1.AppError(400, 'OTP expired');
    return true;
};
exports.verifyResetOtp = verifyResetOtp;
const resetPassword = async (payload) => {
    const user = await user_model_1.User.findOne({
        email: payload.email,
        resetPasswordOtp: payload.otp
    });
    if (!user)
        throw new apiError_1.AppError(400, 'Invalid OTP or email');
    if (user.resetPasswordOtpExpiresAt && user.resetPasswordOtpExpiresAt < new Date())
        throw new apiError_1.AppError(400, 'OTP expired');
    user.passwordHash = await bcrypt_1.default.hash(payload.newPassword, 12);
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpiresAt = undefined;
    await user.save();
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
    await user.save();
};
exports.changePassword = changePassword;
