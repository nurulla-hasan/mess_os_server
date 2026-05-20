import { z } from 'zod';
import { dateStringSchema } from '../../shared/validations/dateString';

export const createUtilityBillSchema = z.object({
  body: z.object({
    category: z.string().trim().min(1),
    amount: z.number().positive(),
    billingMonth: z.number().min(1).max(12),
    year: z.number().positive(),
    dueDate: dateStringSchema.optional()
  }).strict()
});

export const updateUtilityBillSchema = z.object({
  body: z.object({
    category: z.string().trim().min(1).optional(),
    amount: z.number().positive().optional(),
    billingMonth: z.number().min(1).max(12).optional(),
    year: z.number().positive().optional(),
    dueDate: dateStringSchema.optional()
  }).strict().refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  })
});
