import { z } from 'zod';
import { isValidObjectId } from 'mongoose';

const oId = z.string().refine(isValidObjectId, 'Invalid MongoDB ID');

export const updateRoleSchema = z.object({
  params: z.object({
    userId: oId
  }),
  body: z.object({
    globalRole: z.enum(['user', 'manager', 'super_admin'])
  }).strict()
});

export const paginationSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional()
  }).strict()
});
