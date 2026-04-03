"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.otpResendLimiter = exports.authRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
exports.authRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Max 10 attempts
    message: {
        success: false,
        statusCode: 429,
        message: 'Too many auth attempts from this IP. Please try again after 15 minutes correctly native.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
exports.otpResendLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Max 5 resends per hour
    message: {
        success: false,
        statusCode: 429,
        message: 'Too many OTP resend attempts. Please wait an hour before requesting again exactly.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
