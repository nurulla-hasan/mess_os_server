import { z } from 'zod';
import { isValidObjectId } from 'mongoose';

const oId = z.string().refine(isValidObjectId);
const emptyToUndefined = (value: unknown) => value === '' ? undefined : value;
const positiveIntegerString = z.string().regex(/^\d+$/).refine((value) => Number(value) >= 1, {
  message: 'Value must be at least 1',
});
const limitString = positiveIntegerString.refine((value) => Number(value) <= 100, {
  message: 'Limit cannot be greater than 100',
});
const noticeStatus = z.enum(['active', 'archived']);

export const listNoticesSchema = z.object({
  query: z.object({
    page: z.preprocess(emptyToUndefined, positiveIntegerString.optional()),
    limit: z.preprocess(emptyToUndefined, limitString.optional()),
    status: z.preprocess(emptyToUndefined, noticeStatus.optional()),
    searchTerm: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
  }).strict()
});

export const noticeIdParamSchema = z.object({
  params: z.object({ messId: oId, noticeId: oId }).strict()
});

export const createNoticeSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(120),
    content: z.string().trim().min(1).max(5000),
    isPinned: z.boolean().optional()
  }).strict()
});

export const updateNoticeSchema = z.object({
  params: z.object({ messId: oId, noticeId: oId }).strict(),
  body: z.object({
    title: z.string().trim().min(1).max(120).optional(),
    content: z.string().trim().min(1).max(5000).optional(),
    isPinned: z.boolean().optional(),
    status: noticeStatus.optional()
  }).strict().refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })
});

export const setNoticePinSchema = z.object({
  params: z.object({ messId: oId, noticeId: oId }).strict(),
  body: z.object({
    isPinned: z.boolean(),
  }).strict()
});

export type CreateNoticePayload = z.infer<typeof createNoticeSchema>['body'];
export type UpdateNoticePayload = z.infer<typeof updateNoticeSchema>['body'];
export type ListNoticesQuery = z.infer<typeof listNoticesSchema>['query'];
export type NoticeIdParams = z.infer<typeof noticeIdParamSchema>['params'];
export type SetNoticePinPayload = z.infer<typeof setNoticePinSchema>['body'];
