"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.resetPassword = exports.verifyResetOtp = exports.forgotPassword = exports.logout = exports.refreshToken = exports.resendOtp = exports.verifyEmail = exports.login = exports.register = void 0;
const asyncHandler_1 = require("../../shared/utils/asyncHandler");
const apiResponse_1 = require("../../shared/utils/apiResponse");
const authService = __importStar(require("./auth.service"));
const config_1 = require("../../config");
const REFRESH_COOKIE_NAME = 'refreshToken';
exports.register = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    const user = await authService.registerUser(req.body);
    (0, apiResponse_1.sendResponse)(res, { statusCode: 201, success: true, message: 'User registered. Please check email for OTP.', data: user });
});
exports.login = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    const { user, accessToken, refreshToken } = await authService.loginUser(req.body);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
        httpOnly: true,
        secure: config_1.config.env === 'production',
        sameSite: config_1.config.env === 'production' ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Login successful', data: { user, accessToken } });
});
exports.verifyEmail = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    const user = await authService.verifyEmail(req.body.email, req.body.otp);
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Email verified successfully', data: user });
});
exports.resendOtp = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    await authService.resendOtp(req.body.email);
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'New OTP sent correctly' });
});
exports.refreshToken = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    const token = req.cookies[REFRESH_COOKIE_NAME];
    if (!token) {
        return (0, apiResponse_1.sendResponse)(res, { statusCode: 401, success: false, message: 'No refresh token provided' });
    }
    const { accessToken, refreshToken: newRefreshToken } = await authService.refreshToken(token);
    // Rotation: Update cookie
    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, {
        httpOnly: true,
        secure: config_1.config.env === 'production',
        sameSite: config_1.config.env === 'production' ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Token rotated', data: { accessToken } });
});
exports.logout = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    if (req.user) {
        await authService.logout(req.user.userId);
    }
    res.clearCookie(REFRESH_COOKIE_NAME);
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Logout successful' });
});
exports.forgotPassword = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    await authService.forgotPassword(req.body.email);
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Password reset OTP sent natively' });
});
exports.verifyResetOtp = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    await authService.verifyResetOtp(req.body.email, req.body.otp);
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Reset OTP verified. You may proceed to reset password.' });
});
exports.resetPassword = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    await authService.resetPassword(req.body);
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Password reset successfully' });
});
exports.changePassword = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    await authService.changePassword(req.user.userId, req.body.oldPassword, req.body.newPassword);
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Password updated successfully' });
});
