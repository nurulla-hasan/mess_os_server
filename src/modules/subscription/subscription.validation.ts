import { z } from 'zod';

export const subscribeSchema = z.object({
  body: z.object({
    planId: z.string().min(1),
    paymentToken: z.string().min(1)
  }).strict()
});
