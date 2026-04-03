import { z } from 'zod';

export const createUtilityBillSchema = z.object({
  body: z.object({
    category: z.string().min(1),
    amount: z.number().positive(),
    billingMonth: z.number().min(1).max(12),
    year: z.number().positive(),
    dueDate: z.string().datetime().optional()
  }).strict()
});
