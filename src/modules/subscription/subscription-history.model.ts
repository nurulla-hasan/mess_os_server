import { Schema, model, Document, Types } from 'mongoose';

export interface ISubscriptionHistory extends Document {
  messId: Types.ObjectId;
  planId: string;
  action: 'default_assigned' | 'subscribed' | 'canceled' | 'fallback_to_default' | 'payment_failed';
  amount?: number;
  note?: string;
  createdAt: Date;
}

const subHistorySchema = new Schema<ISubscriptionHistory>({
  messId: { type: Schema.Types.ObjectId, ref: 'Mess', required: true },
  planId: { type: String, required: true },
  action: { type: String, required: true, enum: ['default_assigned', 'subscribed', 'canceled', 'fallback_to_default', 'payment_failed'] },
  amount: { type: Number },
  note: { type: String }
}, {
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false
});

export const SubscriptionHistory = model<ISubscriptionHistory>('SubscriptionHistory', subHistorySchema);
