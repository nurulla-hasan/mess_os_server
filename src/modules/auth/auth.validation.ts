import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    fullName: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
    phone: z.string().optional()
  }).strict()
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string()
  }).strict()
});

export const verifyEmailSchema = z.object({
  body: z.object({
    email: z.string().email(),
    otp: z.string().length(6)
  }).strict()
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email()
  }).strict()
});

export const verifyResetOtpSchema = z.object({
  body: z.object({
    email: z.string().email(),
    otp: z.string().length(6)
  }).strict()
});

export const resetPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
    otp: z.string().length(6),
    newPassword: z.string().min(6)
  }).strict()
});

export const changePasswordSchema = z.object({
  body: z.object({
    oldPassword: z.string(),
    newPassword: z.string().min(6)
  }).strict()
});

export const resendOtpSchema = z.object({
  body: z.object({
    email: z.string().email()
  }).strict()
});
