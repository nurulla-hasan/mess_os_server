import { z } from 'zod';
import { isValidObjectId } from 'mongoose';
import { FUND_SOURCES } from '../../constants/ledgerEntryTypes';

const oId = z.string().refine(isValidObjectId);

export const createMarketScheduleSchema = z.object({
  body: z.object({
    assignedTo: z.array(oId).min(1),
    targetDate: z.string().datetime().or(z.string()),
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

export const reassignScheduleSchema = z.object({
  body: z.object({
    assignedTo: z.array(oId).min(1)
  }).strict()
});

export const updateActualSpentSchema = z.object({
  body: z.object({
    actualSpent: z.number().nonnegative()
  }).strict()
});

export const completeMarketScheduleSchema = z.object({
  body: z.object({
    actualSpent: z.number().positive(),
    actorMessMemberId: oId,
    fundSource: z.enum([FUND_SOURCES.MESS_CASH, FUND_SOURCES.PERSONAL_CASH])
  }).strict()
});
