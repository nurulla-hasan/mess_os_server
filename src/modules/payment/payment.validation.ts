import { z } from 'zod';
import { isValidObjectId } from 'mongoose';

const oId = z.string().refine(isValidObjectId, { message: 'Invalid ObjectId format' });
const emptyToUndefined = (value: unknown) => value === '' ? undefined : value;

export const createPaymentSchema = z.object({
  body: z.object({
    messMemberId: oId.optional(),
    amount: z.number().positive(),
    method: z.string().min(1),
    reference: z.string().optional()
  }).strict()
});

export type CreatePaymentPayload = z.infer<typeof createPaymentSchema>['body'];

export const listPaymentsSchema = z.object({
  query: z.object({
    page: z.preprocess(emptyToUndefined, z.string().regex(/^\d+$/).optional()),
    limit: z.preprocess(emptyToUndefined, z.string().regex(/^\d+$/).optional()),
    messMemberId: z.preprocess(emptyToUndefined, oId.optional()),
    status: z.preprocess(emptyToUndefined, z.enum(['pending', 'approved', 'rejected', 'canceled']).optional()),
  }).strict()
});

export const updatePaymentStatusSchema = z.object({
  params: z.object({ messId: oId, paymentId: oId }).strict(),
  body: z.object({
    status: z.enum(['approved', 'rejected', 'canceled']),
  }).strict()
});

export const paymentIdParamSchema = z.object({
  params: z.object({ messId: oId, paymentId: oId }).strict()
});
