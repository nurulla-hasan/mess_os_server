import { z } from 'zod';
import { dateStringSchema } from '../../shared/validations/dateString';

export const createUtilityBillSchema = z.object({
  body: z.object({
    category: z.string().min(1),
    amount: z.number().positive(),
    billingMonth: z.number().min(1).max(12),
    year: z.number().positive(),
    dueDate: dateStringSchema.optional()
  }).strict()
});
