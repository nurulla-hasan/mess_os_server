import { z } from 'zod';
import { isValidObjectId } from 'mongoose';
import { dateStringSchema } from '../../shared/validations/dateString';

const oId = z.string().refine(isValidObjectId);
const emptyToUndefined = (value: unknown) => value === '' ? undefined : value;
const positiveIntegerString = z.string().regex(/^\d+$/).refine((value) => Number(value) >= 1, {
  message: 'Value must be at least 1',
});

const monthString = positiveIntegerString.refine((value) => Number(value) <= 12, {
  message: 'Month must be between 1 and 12',
});

const yearString = positiveIntegerString.refine((value) => Number(value) >= 2000 && Number(value) <= 2100, {
  message: 'Year must be between 2000 and 2100',
});

export const financialReportSchema = z.object({
  query: z.object({
    month: z.preprocess(emptyToUndefined, monthString),
    year: z.preprocess(emptyToUndefined, yearString),
  }).strict()
});

export const memberStatementSchema = z.object({
  params: z.object({ messId: oId, memberId: oId }).strict()
});

export const dateRangeReportSchema = z.object({
  query: z.object({
    start: z.preprocess(emptyToUndefined, dateStringSchema.optional()),
    end: z.preprocess(emptyToUndefined, dateStringSchema.optional()),
    startDate: z.preprocess(emptyToUndefined, dateStringSchema.optional()),
    endDate: z.preprocess(emptyToUndefined, dateStringSchema.optional()),
    month: z.preprocess(emptyToUndefined, monthString.optional()),
    year: z.preprocess(emptyToUndefined, yearString.optional()),
    scope: z.preprocess(emptyToUndefined, z.enum(['all', 'my']).optional()),
    messMemberId: z.preprocess(emptyToUndefined, oId.optional()),
    memberId: z.preprocess(emptyToUndefined, oId.optional()),
  }).strict().superRefine((value, ctx) => {
    const hasMonth = Boolean(value.month);
    const hasYear = Boolean(value.year);
    if (hasMonth !== hasYear) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: hasMonth ? ['year'] : ['month'],
        message: 'Both month and year are required together',
      });
    }
  })
});

export const exportCsvReportSchema = z.object({
  query: z.object({
    type: z.preprocess(emptyToUndefined, z.enum(['expenses', 'payments']).optional()),
    start: z.preprocess(emptyToUndefined, dateStringSchema.optional()),
    end: z.preprocess(emptyToUndefined, dateStringSchema.optional()),
    startDate: z.preprocess(emptyToUndefined, dateStringSchema.optional()),
    endDate: z.preprocess(emptyToUndefined, dateStringSchema.optional()),
    month: z.preprocess(emptyToUndefined, monthString.optional()),
    year: z.preprocess(emptyToUndefined, yearString.optional()),
  }).strict().superRefine((value, ctx) => {
    const hasMonth = Boolean(value.month);
    const hasYear = Boolean(value.year);
    if (hasMonth !== hasYear) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: hasMonth ? ['year'] : ['month'],
        message: 'Both month and year are required together',
      });
    }
  })
});

