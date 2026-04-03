import { z } from 'zod';
export const createNoticeSchema = z.object({ body: z.object({ title: z.string().min(1), content: z.string().min(1), isPinned: z.boolean().optional() }).strict() });
export const updateNoticeSchema = z.object({ body: z.object({ title: z.string().optional(), content: z.string().optional(), isPinned: z.boolean().optional(), status: z.enum(['active','archived']).optional() }).strict() });
