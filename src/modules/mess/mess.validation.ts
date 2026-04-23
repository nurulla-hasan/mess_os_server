import { z } from 'zod';
import { isValidObjectId } from 'mongoose';

const oId = z.string().refine(isValidObjectId, 'Invalid MongoDB ID');

export const createMessSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Mess name must be at least 2 characters'),
    address: z.string().min(3, 'Address must be at least 3 characters'),
    settings: z.object({
      mealCategories: z.array(z.string()).optional(),
      equalShareCategories: z.array(z.string()).optional()
    }).strict().optional(),
  }).strict(),
});

export const updateMessSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    address: z.string().min(3).optional(),
    settings: z.object({
      mealCategories: z.array(z.string()).optional(),
      equalShareCategories: z.array(z.string()).optional()
    }).strict().optional(),
  }).strict(),
});

export const transferOwnershipSchema = z.object({
  body: z.object({
    newManagerUserId: oId,
  }).strict(),
});
