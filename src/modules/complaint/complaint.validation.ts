import { z } from 'zod';
import { isValidObjectId } from 'mongoose';

const oId = z.string().refine(isValidObjectId);
const emptyToUndefined = (value: unknown) => value === '' ? undefined : value;
const positiveIntegerString = z.string().regex(/^\d+$/).refine((value) => Number(value) >= 1);
const limitString = positiveIntegerString.refine((value) => Number(value) <= 100, {
  message: 'Limit cannot be greater than 100',
});

export const createComplaintSchema = z.object({
  body: z.object({
    title: z.string().min(1),
    description: z.string().min(1)
  }).strict()
});

export type CreateComplaintPayload = z.infer<typeof createComplaintSchema>['body'];

export const listComplaintsSchema = z.object({
  query: z.object({
    page: z.preprocess(emptyToUndefined, positiveIntegerString.optional()),
    limit: z.preprocess(emptyToUndefined, limitString.optional()),
    scope: z.preprocess(emptyToUndefined, z.enum(['all', 'my']).optional()),
    status: z.preprocess(emptyToUndefined, z.enum(['open', 'in_progress', 'resolved', 'rejected']).optional()),
  }).strict()
});

export const updateStatusSchema = z.object({
  params: z.object({ messId: oId, complaintId: oId }).strict(),
  body: z.object({
    status: z.enum(['in_progress', 'resolved', 'rejected']),
    resolvedNote: z.string().min(1).optional(),
  }).strict()
});
