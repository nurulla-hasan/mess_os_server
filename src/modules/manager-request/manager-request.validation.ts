import { z } from 'zod';
import { isValidObjectId } from 'mongoose';

const oId = z.string().refine(isValidObjectId, 'Invalid MongoDB ID');

export const createManagerRequestSchema = z.object({
  body: z.object({
    reason: z.string().trim().max(500).optional(),
  }).strict(),
});

export const listManagerRequestsSchema = z.object({
  query: z.object({
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
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
