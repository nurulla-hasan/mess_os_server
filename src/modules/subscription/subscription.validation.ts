import { z } from 'zod';
import { isValidObjectId } from 'mongoose';

const oId = z.string().refine(isValidObjectId, 'Invalid MongoDB ID');

const featuresSchema = z.object({
  meals: z.boolean().optional(),
  expenses: z.boolean().optional(),
  billing: z.boolean().optional(),
  reports: z.boolean().optional(),
  marketSchedule: z.boolean().optional(),
  aiShopping: z.boolean().optional(),
  notices: z.boolean().optional(),
  complaints: z.boolean().optional(),
  prioritySupport: z.boolean().optional(),
}).strict();

export const subscribeSchema = z.object({
  body: z.object({
    planId: z.string().min(1)
  }).strict()
});

export const createPlanSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1),
    code: z.string().trim().toLowerCase().regex(/^[a-z0-9_]+$/, 'Code can contain lowercase letters, numbers, and underscores only'),
    price: z.number().min(0),
    currency: z.string().trim().length(3).default('BDT'),
    billingCycle: z.enum(['free', 'monthly', 'yearly']),
    durationDays: z.number().int().positive().optional(),
    maxMembers: z.number().int().positive(),
    features: featuresSchema.optional(),
    isDefault: z.boolean().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
  }).strict(),
});

export const updatePlanSchema = z.object({
  params: z.object({
    planId: oId,
  }).strict(),
  body: z.object({
    name: z.string().trim().min(1).optional(),
    code: z.string().trim().toLowerCase().regex(/^[a-z0-9_]+$/).optional(),
    price: z.number().min(0).optional(),
    currency: z.string().trim().length(3).optional(),
    billingCycle: z.enum(['free', 'monthly', 'yearly']).optional(),
    durationDays: z.number().int().positive().optional(),
    maxMembers: z.number().int().positive().optional(),
    features: featuresSchema.optional(),
    isDefault: z.boolean().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
  }).strict(),
});

export const deletePlanSchema = z.object({
  params: z.object({
    planId: oId,
  }).strict(),
});
