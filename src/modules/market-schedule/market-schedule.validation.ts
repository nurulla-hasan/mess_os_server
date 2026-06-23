import { z } from 'zod';
import { isValidObjectId } from 'mongoose';
import { FUND_SOURCES } from '../../constants/ledgerEntryTypes';
import { dateStringSchema } from '../../shared/validations/dateString';

const oId = z.string().refine(isValidObjectId);
const emptyToUndefined = (value: unknown) => value === '' ? undefined : value;
const positiveIntegerString = z.string().regex(/^\d+$/).refine((value) => Number(value) >= 1);
const limitString = positiveIntegerString.refine((value) => Number(value) <= 100, {
  message: 'Limit cannot be greater than 100',
});

export type CreateMarketSchedulePayload = z.infer<typeof createMarketScheduleSchema>['body'];
export type UpdateMarketSchedulePayload = z.infer<typeof updateMarketScheduleSchema>['body'];
export type UpdateMarketScheduleStatusPayload = z.infer<typeof updateMarketScheduleStatusSchema>['body'];

export const listMarketScheduleSchema = z.object({
  query: z.object({
    page: z.preprocess(emptyToUndefined, positiveIntegerString.optional()),
    limit: z.preprocess(emptyToUndefined, limitString.optional()),
    scope: z.preprocess(emptyToUndefined, z.enum(['all', 'my']).optional()),
    status: z.preprocess(emptyToUndefined, z.enum(['pending', 'completed', 'void']).optional()),
  }).strict()
});

export const createMarketScheduleSchema = z.object({
  body: z.object({
    assignedTo: z.array(oId).min(1),
    targetDate: dateStringSchema,
    shoppingItems: z.array(z.object({ name: z.string(), quantity: z.string() })),
    estimatedBudget: z.number().positive()
  }).strict()
});

export const updateMarketScheduleSchema = z.object({
  body: z.object({
    assignedTo: z.array(oId).min(1).optional(),
    shoppingItems: z.array(z.object({ name: z.string(), quantity: z.string() })).optional(),
    estimatedBudget: z.number().positive().optional()
  }).strict()
});

export const updateMarketScheduleStatusSchema = z.object({
  params: z.object({ messId: oId, scheduleId: oId }).strict(),
  body: z.object({
    status: z.enum(['completed', 'void']),
    actualSpent: z.number().positive().optional(),
    fundSource: z.enum([FUND_SOURCES.MESS_CASH, FUND_SOURCES.PERSONAL_CASH]).optional()
  }).strict().superRefine((value, ctx) => {
    if (value.status === 'completed') {
      if (value.actualSpent === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['actualSpent'], message: 'actualSpent is required when status is completed' });
      if (!value.fundSource) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fundSource'], message: 'fundSource is required when status is completed' });
    }
  })
});
