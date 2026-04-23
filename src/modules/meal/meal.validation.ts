import { z } from 'zod';
import { isValidObjectId } from 'mongoose';

const oId = z.string().refine(isValidObjectId);

export const logMealSchema = z.object({
  body: z.object({
    messMemberId: oId,
    date: z.string().datetime(),
    mealCount: z.number().min(0)
  }).strict()
});
