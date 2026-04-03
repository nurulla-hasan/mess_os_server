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
exports.authRoutes = void 0;
const express_1 = require("express");
const validateRequest_1 = require("../../shared/middlewares/validateRequest");
const authenticate_1 = require("../../shared/middlewares/authenticate");
const rateLimiter_1 = require("../../shared/middlewares/rateLimiter");
const val = __importStar(require("./auth.validation"));
const ctl = __importStar(require("./auth.controller"));
const router = (0, express_1.Router)();
router.post('/register', (0, validateRequest_1.validateRequest)(val.registerSchema), ctl.register);
router.post('/login', rateLimiter_1.authRateLimiter, (0, validateRequest_1.validateRequest)(val.loginSchema), ctl.login);
router.post('/verify-email', rateLimiter_1.authRateLimiter, (0, validateRequest_1.validateRequest)(val.verifyEmailSchema), ctl.verifyEmail);
router.post('/resend-otp', rateLimiter_1.otpResendLimiter, (0, validateRequest_1.validateRequest)(val.resendOtpSchema), ctl.resendOtp);
router.post('/refresh-token', ctl.refreshToken);
router.post('/logout', ctl.logout);
router.post('/forgot-password', rateLimiter_1.authRateLimiter, (0, validateRequest_1.validateRequest)(val.forgotPasswordSchema), ctl.forgotPassword);
router.post('/verify-reset-otp', rateLimiter_1.authRateLimiter, (0, validateRequest_1.validateRequest)(val.verifyResetOtpSchema), ctl.verifyResetOtp);
router.post('/reset-password', rateLimiter_1.authRateLimiter, (0, validateRequest_1.validateRequest)(val.resetPasswordSchema), ctl.resetPassword);
router.post('/change-password', authenticate_1.authenticate, (0, validateRequest_1.validateRequest)(val.changePasswordSchema), ctl.changePassword);
exports.authRoutes = router;
