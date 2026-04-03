import { z } from 'zod';

export const updateMeSchema = z.object({
  body: z.object({
    fullName: z.string().min(1).optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    bio: z.string().max(500).optional()
  }).strict()
});

export const updateAvatarSchema = z.object({
  body: z.object({
    avatarUrl: z.string().url()
  }).strict()
});
