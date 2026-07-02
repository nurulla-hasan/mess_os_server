import { z } from 'zod';

export const chatSchema = z.object({
  body: z.object({
    question: z.string().min(1, 'Question is required').max(1000, 'Question is too long'),
    context: z.string().optional(),
    sessionId: z.string().optional(),
  }).strict()
});

export const sessionQuerySchema = z.object({
  query: z.object({
    sessionId: z.string().min(1, 'Session ID is required'),
  }).strict()
});

export type ChatPayload = z.infer<typeof chatSchema>['body'];
