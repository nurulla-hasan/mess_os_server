import { z } from 'zod';

export const updateMeSchema = z.object({
  body: z.object({
    fullName: z.string().min(1).optional(),
    phone: z.string().optional()
  }).strict()
});
