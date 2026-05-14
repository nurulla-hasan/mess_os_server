import { z } from 'zod';
import { isValidObjectId } from 'mongoose';

const oId = z.string().refine(isValidObjectId, 'Invalid MongoDB ID');
const category = z.string().trim().min(1).max(40);
const categoryArray = z.array(category).min(1).max(20).refine((items) => {
  const normalized = items.map((item) => item.toLowerCase());
  return new Set(normalized).size === normalized.length;
}, 'Categories must be unique');
const settingsSchema = z.object({
  mealCategories: categoryArray.optional(),
  equalShareCategories: categoryArray.optional()
}).strict();

export const createMessSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Mess name must be at least 2 characters').max(80),
    address: z.string().trim().min(3, 'Address must be at least 3 characters').max(200),
    settings: settingsSchema.optional(),
  }).strict(),
});

export const updateMessSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80).optional(),
    address: z.string().trim().min(3).max(200).optional(),
    settings: settingsSchema.optional(),
  }).strict().refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  }),
});

export const transferOwnershipSchema = z.object({
  body: z.object({
    newManagerUserId: oId,
  }).strict(),
});
