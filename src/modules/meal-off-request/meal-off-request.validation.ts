import { z } from 'zod';
import { isValidObjectId } from 'mongoose';

const oId = z.string().refine(isValidObjectId);

export const createMealOffSchema = z.object({
  body: z.object({
    messMemberId: oId,
    startDate: z.string(),
    endDate: z.string(),
    reason: z.string().optional()
  }).strict()
});
