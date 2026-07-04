import { z } from 'zod';

export const upsertMarketPriceSchema = z.object({
  body: z.object({
    itemName: z.string().min(1, 'Item name is required'),
    price: z.number().min(0, 'Price must be >= 0'),
    unit: z.string().optional().default('KG'),
    category: z.enum(['bazar', 'meat', 'vegetables', 'dairy', 'spices', 'other']).optional().default('other'),
  }),
});

export const bulkUpsertMarketPriceSchema = z.object({
  body: z.object({
    items: z.array(z.object({
      itemName: z.string().min(1, 'Item name is required'),
      price: z.number().min(0, 'Price must be >= 0'),
      unit: z.string().optional().default('KG'),
      category: z.enum(['bazar', 'meat', 'vegetables', 'dairy', 'spices', 'other']).optional().default('other'),
    })),
  }),
});

export const deleteMarketPriceSchema = z.object({
  params: z.object({
    itemName: z.string().min(1, 'Item name is required'),
  }),
});

export type UpsertMarketPricePayload = z.infer<typeof upsertMarketPriceSchema>['body'];
export type BulkUpsertMarketPricePayload = z.infer<typeof bulkUpsertMarketPriceSchema>['body'];
