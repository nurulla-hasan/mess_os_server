import { Router } from 'express';
import { validateRequest } from '../../shared/middlewares/validateRequest';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authRateLimiter, otpResendLimiter } from '../../shared/middlewares/rateLimiter';
import * as val from './auth.validation';
import * as ctl from './auth.controller';

const router = Router();

router.post('/register', validateRequest(val.registerSchema), ctl.register);
router.post('/login', authRateLimiter, validateRequest(val.loginSchema), ctl.login);

router.post('/verify-email', authRateLimiter, validateRequest(val.verifyEmailSchema), ctl.verifyEmail);
router.post('/resend-otp', otpResendLimiter, validateRequest(val.resendOtpSchema), ctl.resendOtp);

router.post('/refresh-token', ctl.refreshToken);
router.post('/logout', ctl.logout);

router.post('/forgot-password', authRateLimiter, validateRequest(val.forgotPasswordSchema), ctl.forgotPassword);
router.post('/verify-reset-otp', authRateLimiter, validateRequest(val.verifyResetOtpSchema), ctl.verifyResetOtp);
router.post('/reset-password', authRateLimiter, validateRequest(val.resetPasswordSchema), ctl.resetPassword);

router.post('/change-password', authenticate, validateRequest(val.changePasswordSchema), ctl.changePassword);

export const authRoutes = router;
