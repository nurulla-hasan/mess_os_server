import { z } from 'zod';

export const createMessSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Mess name must be at least 2 characters'),
    address: z.string().min(3, 'Address must be at least 3 characters'),
    settings: z.record(z.any()).optional(),
  }),
});

export const updateMessSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    address: z.string().min(3).optional(),
    settings: z.record(z.any()).optional(),
  }).strict(),
});

export const transferOwnershipSchema = z.object({
  body: z.object({
    newManagerUserId: z.string().min(1, 'newManagerUserId is required'),
  }),
});
