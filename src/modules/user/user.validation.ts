import { z } from 'zod';
import { isValidObjectId } from 'mongoose';

const oId = z.string().refine(isValidObjectId, 'Invalid MongoDB ID');

export const updateMeSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(1).max(80).optional(),
    phone: z.string().trim().max(20).optional(),
    address: z.string().trim().max(200).optional(),
    bio: z.string().trim().max(500).optional()
  }).strict().refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })
});

export const switchMessSchema = z.object({
  body: z.object({
    messId: oId,
  }).strict(),
});

export type UpdateMePayload = z.infer<typeof updateMeSchema>['body'];
export type SwitchMessPayload = z.infer<typeof switchMessSchema>['body'];
