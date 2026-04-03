import { z } from 'zod';

export const previewBillingSchema = z.object({
  body: z.object({
    month: z.number().min(1).max(12),
    year: z.number().positive(),
  }).strict()
});

export const finalizeBillingSchema = z.object({
  body: z.object({
    month: z.number().min(1).max(12),
    year: z.number().positive(),
  }).strict()
});
