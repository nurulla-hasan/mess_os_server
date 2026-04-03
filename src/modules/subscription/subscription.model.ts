import { Schema, model, Document } from 'mongoose';

export interface ISubscription extends Document {
  messId: Schema.Types.ObjectId;
  planId: string;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
}

const subSchema = new Schema<ISubscription>({
  messId: { type: Schema.Types.ObjectId, ref: 'Mess', required: true, unique: true },
  planId: { type: String, required: true },
  status: { type: String, required: true, enum: ['trialing', 'active', 'past_due', 'canceled', 'unpaid'], default: 'trialing' },
  currentPeriodStart: { type: Date, required: true },
  currentPeriodEnd: { type: Date, required: true },
  cancelAtPeriodEnd: { type: Boolean, default: false },
  stripeSubscriptionId: String,
  stripeCustomerId: String
}, {
  timestamps: true,
  versionKey: false,
  toJSON: { transform: (_, ret) => { ret.id = ret._id; delete ret._id; return ret; } }
});

export const Subscription = model<ISubscription>('Subscription', subSchema);
