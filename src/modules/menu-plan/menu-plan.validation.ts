import { z } from 'zod';
import { isValidObjectId } from 'mongoose';
import { dateStringSchema } from '../../shared/validations/dateString';

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
    start: z.preprocess(emptyToUndefined, dateStringSchema.optional()),
    end: z.preprocess(emptyToUndefined, dateStringSchema.optional()),
    startDate: z.preprocess(emptyToUndefined, dateStringSchema.optional()),
    endDate: z.preprocess(emptyToUndefined, dateStringSchema.optional()),
  }).strict()
});

export const createMenuPlanSchema = z.object({
  body: z.object({
    date: dateStringSchema,
    meals: mealsSchema.optional(),
    isAiGenerated: z.boolean().default(false),
    aiPreference: z.string().trim().max(200).optional(),
    aiBudget: z.number().positive().optional(),
    avoidRecentDays: z.number().int().min(0).max(30).optional()
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
