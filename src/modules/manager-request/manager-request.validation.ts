import { z } from 'zod';
import { isValidObjectId } from 'mongoose';

const oId = z.string().refine(isValidObjectId, 'Invalid MongoDB ID');
const emptyToUndefined = (value: unknown) => value === '' ? undefined : value;

export const createManagerRequestSchema = z.object({
  body: z.object({
    reason: z.string().trim().max(500).optional(),
  }).strict(),
});

export const listManagerRequestsSchema = z.object({
  query: z.object({
    status: z.preprocess(emptyToUndefined, z.enum(['pending', 'approved', 'rejected']).optional()),
    searchTerm: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
    page: z.preprocess(emptyToUndefined, z.string().regex(/^\d+$/).optional()),
    limit: z.preprocess(emptyToUndefined, z.string().regex(/^\d+$/).optional()),
  }).strict(),
});

export const reviewManagerRequestSchema = z.object({
  params: z.object({
    requestId: oId,
  }).strict(),
  body: z.object({
    status: z.enum(['approved', 'rejected']),
    adminNote: z.string().trim().max(500).optional(),
  }).strict(),
});
