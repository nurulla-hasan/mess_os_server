import { z } from 'zod';
import { isValidObjectId } from 'mongoose';
import { FUND_SOURCES } from '../../constants/ledgerEntryTypes';

const oId = z.string().refine(isValidObjectId);
const emptyToUndefined = (value: unknown) => value === '' ? undefined : value;

export const createExpenseSchema = z.object({
  body: z.object({
    category: z.string().min(1),
    amount: z.number().positive(),
    date: z.string().datetime(),
    paidBy: oId,
    fundSource: z.enum([FUND_SOURCES.MESS_CASH, FUND_SOURCES.PERSONAL_CASH]),
    receiptUrl: z.string().url().optional()
  }).strict()
});

export type CreateExpensePayload = z.infer<typeof createExpenseSchema>['body'];

export const listExpensesSchema = z.object({
  query: z.object({
    page: z.preprocess(emptyToUndefined, z.string().regex(/^\d+$/).optional()),
    limit: z.preprocess(emptyToUndefined, z.string().regex(/^\d+$/).optional()),
    status: z.preprocess(emptyToUndefined, z.enum(['pending', 'approved', 'rejected', 'canceled']).optional()),
  }).strict()
});

export const expenseIdParamSchema = z.object({
  params: z.object({ expenseId: oId }).strict()
});
