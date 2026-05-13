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
const mealOffStatus = z.enum(['pending', 'approved', 'rejected', 'canceled']);

export const createMealOffSchema = z.object({
  body: z.object({
    messMemberId: oId.optional(),
    startDate: z.string(),
    endDate: z.string(),
    reason: z.string().optional()
  }).strict()
});

export const listMealOffRequestsSchema = z.object({
  query: z.object({
    page: z.preprocess(emptyToUndefined, positiveIntegerString.optional()),
    limit: z.preprocess(emptyToUndefined, limitString.optional()),
    status: z.preprocess(emptyToUndefined, mealOffStatus.optional()),
    scope: z.preprocess(emptyToUndefined, z.enum(['all', 'my']).optional()),
    messMemberId: z.preprocess(emptyToUndefined, oId.optional()),
    memberId: z.preprocess(emptyToUndefined, oId.optional()),
    searchTerm: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
    start: z.preprocess(emptyToUndefined, z.string().optional()),
    end: z.preprocess(emptyToUndefined, z.string().optional()),
    startDate: z.preprocess(emptyToUndefined, z.string().optional()),
    endDate: z.preprocess(emptyToUndefined, z.string().optional()),
  }).strict()
});

export const reviewMealOffRequestSchema = z.object({
  body: z.object({
    status: z.enum(['approved', 'rejected', 'canceled']),
  }).strict()
});
