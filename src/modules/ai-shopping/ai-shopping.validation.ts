import { z } from 'zod';
import { isValidObjectId } from 'mongoose';

const oId = z.string().refine(isValidObjectId);

export const generateListSchema = z.object({
  body: z.object({
    menuPlanId: oId,
    targetDate: z.string().datetime().or(z.string())
  }).strict()
});

export const convertListSchema = z.object({
  body: z.object({
    assignedTo: z.array(oId).min(1),
    estimatedBudget: z.number().positive()
  }).strict()
});
