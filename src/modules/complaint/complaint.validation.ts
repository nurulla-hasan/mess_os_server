import { z } from 'zod';
import { isValidObjectId } from 'mongoose';

const oId = z.string().refine(isValidObjectId);
const emptyToUndefined = (value: unknown) => value === '' ? undefined : value;
const positiveIntegerString = z.string().regex(/^\d+$/).refine((value) => Number(value) >= 1);
const limitString = positiveIntegerString.refine((value) => Number(value) <= 100, {
  message: 'Limit cannot be greater than 100',
});
const complaintStatus = z.enum(['open', 'in_progress', 'resolved', 'rejected']);

export const createComplaintSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(5000)
  }).strict()
});

export type CreateComplaintPayload = z.infer<typeof createComplaintSchema>['body'];
export type ListComplaintsQuery = z.infer<typeof listComplaintsSchema>['query'];
export type ComplaintIdParams = z.infer<typeof complaintIdParamSchema>['params'];
export type UpdateStatusPayload = z.infer<typeof updateStatusSchema>['body'];

export const listComplaintsSchema = z.object({
  query: z.object({
    page: z.preprocess(emptyToUndefined, positiveIntegerString.optional()),
    limit: z.preprocess(emptyToUndefined, limitString.optional()),
    scope: z.preprocess(emptyToUndefined, z.enum(['all', 'my']).optional()),
    status: z.preprocess(emptyToUndefined, complaintStatus.optional()),
    searchTerm: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
    messMemberId: z.preprocess(emptyToUndefined, oId.optional()),
    memberId: z.preprocess(emptyToUndefined, oId.optional()),
  }).strict()
});

export const complaintIdParamSchema = z.object({
  params: z.object({ messId: oId, complaintId: oId }).strict()
});

export const updateStatusSchema = z.object({
  params: z.object({ messId: oId, complaintId: oId }).strict(),
  body: z.object({
    status: z.enum(['in_progress', 'resolved', 'rejected']),
    resolvedNote: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(1000).optional()),
  }).strict().superRefine((value, ctx) => {
    if ((value.status === 'resolved' || value.status === 'rejected') && !value.resolvedNote) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['resolvedNote'],
        message: 'resolvedNote is required when resolving or rejecting a complaint',
      });
    }
  })
});
