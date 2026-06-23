import { z } from 'zod';
import { isValidObjectId } from 'mongoose';
import { dateStringSchema } from '../../shared/validations/dateString';

const oId = z.string().refine(isValidObjectId);
const emptyToUndefined = (value: unknown) => value === '' ? undefined : value;
const positiveIntegerString = z.string().regex(/^\d+$/).refine((value) => Number(value) >= 1);
const limitString = positiveIntegerString.refine((value) => Number(value) <= 100, {
  message: 'Limit cannot be greater than 100',
});

export const listAiShoppingSchema = z.object({
  query: z.object({
    page: z.preprocess(emptyToUndefined, positiveIntegerString.optional()),
    limit: z.preprocess(emptyToUndefined, limitString.optional()),
    status: z.preprocess(emptyToUndefined, z.enum(['draft', 'approved', 'rejected', 'converted']).optional()),
  }).strict()
});

export const generateListSchema = z.object({
  body: z.object({
    menuPlanId: oId,
    targetDate: dateStringSchema
  }).strict()
});

export const convertListSchema = z.object({
  body: z.object({
    assignedTo: z.array(oId).min(1),
    estimatedBudget: z.number().positive()
  }).strict()
});

export const updateListStatusSchema = z.object({
  params: z.object({ messId: oId, listId: oId }).strict(),
  body: z.object({
    status: z.enum(['approved', 'rejected']),
  }).strict()
});

export type GenerateListPayload = z.infer<typeof generateListSchema>['body'];
export type ConvertListPayload = z.infer<typeof convertListSchema>['body'];
export type UpdateListStatusPayload = z.infer<typeof updateListStatusSchema>['body'];
export type UpdateListStatusParams = z.infer<typeof updateListStatusSchema>['params'];
export type ListAiShoppingQuery = z.infer<typeof listAiShoppingSchema>['query'];
