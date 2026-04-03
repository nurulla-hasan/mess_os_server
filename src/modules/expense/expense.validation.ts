import { z } from 'zod';
import { isValidObjectId } from 'mongoose';
import { FUND_SOURCES } from '../../constants/ledgerEntryTypes';

const oId = z.string().refine(isValidObjectId);

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

export const expenseIdParamSchema = z.object({
  params: z.object({ expenseId: oId }).strict()
});
