import { Router } from 'express';
import { validateRequest } from '../../shared/middlewares/validateRequest';
import { authenticate } from '../../shared/middlewares/authenticate';
import * as val from './auth.validation';
import * as ctl from './auth.controller';

const router = Router();

router.post('/register', validateRequest(val.registerSchema), ctl.register);
router.post('/login', validateRequest(val.loginSchema), ctl.login);

router.post('/verify-email', validateRequest(val.verifyEmailSchema), ctl.verifyEmail);
router.post('/resend-otp', validateRequest(val.resendOtpSchema), ctl.resendOtp);

router.post('/refresh-token', ctl.refreshToken);
router.post('/logout', ctl.logout);

router.post('/forgot-password', validateRequest(val.forgotPasswordSchema), ctl.forgotPassword);
router.post('/verify-reset-otp', validateRequest(val.verifyResetOtpSchema), ctl.verifyResetOtp);
router.post('/reset-password', validateRequest(val.resetPasswordSchema), ctl.resetPassword);

router.post('/change-password', authenticate, validateRequest(val.changePasswordSchema), ctl.changePassword);

export const authRoutes = router;
