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
const mealOffStatus = z.enum(['pending', 'approved', 'rejected', 'canceled']);
const mealCategoryList = z.array(z.string().trim().min(1)).min(1).max(10);

export const createMealOffSchema = z.object({
  body: z.object({
    messMemberId: oId.optional(),
    startDate: dateStringSchema,
    endDate: dateStringSchema,
    meals: mealCategoryList.optional(),
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
    start: z.preprocess(emptyToUndefined, dateStringSchema.optional()),
    end: z.preprocess(emptyToUndefined, dateStringSchema.optional()),
    startDate: z.preprocess(emptyToUndefined, dateStringSchema.optional()),
    endDate: z.preprocess(emptyToUndefined, dateStringSchema.optional()),
  }).strict()
});

export const reviewMealOffRequestSchema = z.object({
  params: z.object({
    requestId: oId,
  }),
  body: z.object({
    status: z.enum(['approved', 'rejected', 'canceled']),
  }).strict()
});

export const mealOffRequestIdParamSchema = z.object({
  params: z.object({
    requestId: oId,
  }),
});
