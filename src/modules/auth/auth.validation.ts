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
