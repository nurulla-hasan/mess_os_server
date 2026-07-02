import { z } from 'zod';

export const chatSchema = z.object({
  body: z.object({
    question: z.string().min(1, 'Question is required').max(1000, 'Question is too long'),
    context: z.string().optional(),
  }).strict()
});
