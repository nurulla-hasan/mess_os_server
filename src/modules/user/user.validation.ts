import { z } from 'zod';
import { isValidObjectId } from 'mongoose';

const oId = z.string().refine(isValidObjectId, 'Invalid MongoDB ID');

export const updateMeSchema = z.object({
  body: z.object({
    fullName: z.string().min(1).optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    bio: z.string().max(500).optional()
  }).strict()
});

export const switchMessSchema = z.object({
  body: z.object({
    messId: oId,
  }).strict(),
});

export type UpdateMePayload = z.infer<typeof updateMeSchema>['body'];
export type SwitchMessPayload = z.infer<typeof switchMessSchema>['body'];
