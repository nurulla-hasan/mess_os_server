import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
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

export const otpResendLimiter = rateLimit({
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
