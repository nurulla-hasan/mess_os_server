import { z } from 'zod';
import { isValidObjectId } from 'mongoose';

const oId = z.string().refine(isValidObjectId);

export const logMealSchema = z.object({
  body: z.object({
    messMemberId: oId,
    date: z.string().datetime().or(z.string()), // Accept ISO string generic
    mealCount: z.number().min(0)
  }).strict()
});
