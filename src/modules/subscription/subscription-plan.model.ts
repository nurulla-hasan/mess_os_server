import { Schema, model, Document } from 'mongoose';

export type SubscriptionFeatureKey =
  | 'meals'
  | 'expenses'
  | 'billing'
  | 'reports'
  | 'marketSchedule'
  | 'aiShopping'
  | 'notices'
  | 'complaints'
  | 'prioritySupport';

export interface ISubscriptionPlan extends Document {
  name: string;
  code: string;
  price: number;
  currency: string;
  billingCycle: 'free' | 'monthly' | 'yearly';
  durationDays?: number;
  maxMembers: number;
  features: Partial<Record<SubscriptionFeatureKey, boolean>>;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
}

const featureSchema = new Schema<Record<SubscriptionFeatureKey, boolean>>({
  meals: { type: Boolean, default: true },
  expenses: { type: Boolean, default: true },
  billing: { type: Boolean, default: false },
  reports: { type: Boolean, default: false },
  marketSchedule: { type: Boolean, default: false },
  aiShopping: { type: Boolean, default: false },
  notices: { type: Boolean, default: true },
  complaints: { type: Boolean, default: true },
  prioritySupport: { type: Boolean, default: false },
}, { _id: false });

const subscriptionPlanSchema = new Schema<ISubscriptionPlan>({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, lowercase: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true, default: 'BDT', uppercase: true, trim: true },
  billingCycle: { type: String, enum: ['free', 'monthly', 'yearly'], required: true },
  durationDays: { type: Number, min: 1 },
  maxMembers: { type: Number, required: true, min: 1 },
  features: { type: featureSchema, default: () => ({}) },
  isDefault: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, {
  timestamps: true,
  versionKey: false,
  toJSON: { transform: (_, ret) => { ret.id = ret._id; delete (ret as any)._id; return ret; } },
});

export const SubscriptionPlan = model<ISubscriptionPlan>('SubscriptionPlan', subscriptionPlanSchema);
