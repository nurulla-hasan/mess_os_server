import { z } from 'zod';
import { isValidObjectId } from 'mongoose';

const oId = z.string().refine(isValidObjectId, 'Invalid MongoDB ID');
const emptyToUndefined = (value: unknown) => value === '' ? undefined : value;

export const updateRoleSchema = z.object({
  params: z.object({
    userId: oId
  }),
  body: z.object({
    globalRole: z.enum(['user', 'manager', 'super_admin'])
  }).strict()
});

export const blockUserSchema = z.object({
  params: z.object({
    userId: oId
  }),
  body: z.object({
    status: z.enum(['active', 'blocked']).describe('Toggle user status between active and blocked')
  }).strict()
});

export const suspendMessSchema = z.object({
  params: z.object({
    messId: oId
  }),
  body: z.object({
    status: z.enum(['active', 'suspended']),
    suspensionNote: z.string().trim().max(500).optional()
  }).strict()
});

export const paginationSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    searchTerm: z.string().trim().max(100).optional(),
    status: z.enum(['active', 'suspended']).optional()
  }).strict()
});

export const subscriptionListSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    searchTerm: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
    status: z.preprocess(emptyToUndefined, z.enum(['active', 'past_due', 'canceled', 'unpaid']).optional()),
    planId: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  }).strict()
});
