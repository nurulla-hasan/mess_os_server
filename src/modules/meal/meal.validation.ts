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
const mealCount = z.number().min(0).max(50).refine((value) => Number.isInteger(value * 2), {
  message: 'Meal count must be in 0.5 increments between 0 and 50',
});
const mealBreakdown = z.record(z.string().trim().min(1), mealCount).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one meal category is required',
});
const mealEntry = z.object({
  messMemberId: oId,
  mealCount: mealCount.optional(),
  meals: mealBreakdown.optional(),
}).strict().refine((value) => value.mealCount !== undefined || value.meals !== undefined, {
  message: 'Either mealCount or meals is required',
});

export const logMealSchema = z.object({
  body: z.object({
    messMemberId: oId,
    date: z.string().datetime(),
    mealCount: mealCount.optional(),
    meals: mealBreakdown.optional(),
  }).strict().refine((value) => value.mealCount !== undefined || value.meals !== undefined, {
    message: 'Either mealCount or meals is required',
  })
});

export const bulkLogMealsSchema = z.object({
  body: z.object({
    date: z.string().datetime(),
    entries: z.array(mealEntry).min(1).max(200),
  }).strict()
});

export const listMealsSchema = z.object({
  query: z.object({
    page: z.preprocess(emptyToUndefined, positiveIntegerString.optional()),
    limit: z.preprocess(emptyToUndefined, limitString.optional()),
    memberId: z.preprocess(emptyToUndefined, oId.optional()),
    scope: z.preprocess(emptyToUndefined, z.enum(['all', 'my']).optional()),
    searchTerm: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
    start: z.preprocess(emptyToUndefined, z.string().datetime().optional()),
    end: z.preprocess(emptyToUndefined, z.string().datetime().optional()),
    startDate: z.preprocess(emptyToUndefined, z.string().datetime().optional()),
    endDate: z.preprocess(emptyToUndefined, z.string().datetime().optional()),
  }).strict()
});
