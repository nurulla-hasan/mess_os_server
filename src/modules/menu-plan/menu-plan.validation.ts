import { z } from 'zod';
import { isValidObjectId } from 'mongoose';

const oId = z.string().refine(isValidObjectId);

export const createMenuPlanSchema = z.object({
  body: z.object({
    date: z.string().datetime().or(z.string()),
    meals: z.object({
      breakfast: z.string().optional(),
      lunch: z.string().optional(),
      dinner: z.string().optional()
    }).optional(),
    isAiGenerated: z.boolean().default(false)
  }).strict()
});

export const updateMenuPlanSchema = z.object({
  body: z.object({
    meals: z.object({
      breakfast: z.string().optional(),
      lunch: z.string().optional(),
      dinner: z.string().optional()
    }).optional()
  }).strict()
});

export const dateParamSchema = z.object({
  params: z.object({ date: z.string() }).strict()
});
