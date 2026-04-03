import { Schema, model, Document } from 'mongoose';

export interface ISubscriptionHistory extends Document {
  messId: Schema.Types.ObjectId;
  planId: string;
  action: 'trial_started' | 'subscribed' | 'canceled' | 'payment_failed';
  amount?: number;
  note?: string;
  createdAt: Date;
}

const subHistorySchema = new Schema<ISubscriptionHistory>({
  messId: { type: Schema.Types.ObjectId, ref: 'Mess', required: true },
  planId: { type: String, required: true },
  action: { type: String, required: true, enum: ['trial_started', 'subscribed', 'canceled', 'payment_failed'] },
  amount: { type: Number },
  note: { type: String }
}, {
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false,
  toJSON: { transform: (_, ret) => { ret.id = ret._id; delete ret._id; return ret; } }
});

export const SubscriptionHistory = model<ISubscriptionHistory>('SubscriptionHistory', subHistorySchema);
