import { z } from 'zod';
import { isValidObjectId } from 'mongoose';

const oId = z.string().refine(isValidObjectId);
const emptyToUndefined = (value: unknown) => value === '' ? undefined : value;
const positiveIntegerString = z.string().regex(/^\d+$/).refine((value) => Number(value) >= 1, {
  message: 'Value must be at least 1',
});
const limitString = positiveIntegerString.refine((value) => Number(value) <= 100, {
  message: 'Limit cannot be greater than 100',
});
const menuStatus = z.enum(['draft', 'published', 'archived']);
const mealsSchema = z.record(z.string().trim().min(1), z.string().trim().min(1));

export const listMenuPlansSchema = z.object({
  query: z.object({
    page: z.preprocess(emptyToUndefined, positiveIntegerString.optional()),
    limit: z.preprocess(emptyToUndefined, limitString.optional()),
    status: z.preprocess(emptyToUndefined, menuStatus.optional()),
    start: z.preprocess(emptyToUndefined, z.string().optional()),
    end: z.preprocess(emptyToUndefined, z.string().optional()),
    startDate: z.preprocess(emptyToUndefined, z.string().optional()),
    endDate: z.preprocess(emptyToUndefined, z.string().optional()),
  }).strict()
});

export const createMenuPlanSchema = z.object({
  body: z.object({
    date: z.string().datetime(),
    meals: mealsSchema.optional(),
    isAiGenerated: z.boolean().default(false)
  }).strict()
});

export const updateMenuPlanSchema = z.object({
  body: z.object({
    meals: mealsSchema.optional()
  }).strict()
});

export const updateMenuPlanStatusSchema = z.object({
  params: z.object({ messId: oId, planId: oId }).strict(),
  body: z.object({
    status: z.enum(['published', 'archived'])
  }).strict()
});
