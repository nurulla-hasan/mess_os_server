import { z } from 'zod';

export const createComplaintSchema = z.object({
  body: z.object({
    title: z.string().min(1),
    description: z.string().min(1)
  }).strict()
});

export const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum(['in_progress'])
  }).strict()
});

export const resolveComplaintSchema = z.object({
  body: z.object({
    resolvedNote: z.string().min(1).optional()
  }).strict()
});
