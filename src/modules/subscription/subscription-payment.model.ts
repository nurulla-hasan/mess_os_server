import { Schema, model, Document, Types } from 'mongoose';

export interface ISubscriptionPayment extends Document {
  messId: Types.ObjectId;
  planId: string;
  tranId: string;
  amount: number;
  currency: string;
  status: 'initiated' | 'validated' | 'failed' | 'canceled';
  gateway: 'sslcommerz';
  gatewaySessionKey?: string;
  gatewayUrl?: string;
  valId?: string;
  bankTranId?: string;
  cardType?: string;
  riskLevel?: string;
  rawInitResponse?: unknown;
  rawValidationResponse?: unknown;
}

const subscriptionPaymentSchema = new Schema<ISubscriptionPayment>({
  messId: { type: Schema.Types.ObjectId, ref: 'Mess', required: true },
  planId: { type: String, required: true },
  tranId: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true, uppercase: true },
  status: { type: String, enum: ['initiated', 'validated', 'failed', 'canceled'], default: 'initiated' },
  gateway: { type: String, enum: ['sslcommerz'], default: 'sslcommerz' },
  gatewaySessionKey: { type: String },
  gatewayUrl: { type: String },
  valId: { type: String },
  bankTranId: { type: String },
  cardType: { type: String },
  riskLevel: { type: String },
  rawInitResponse: { type: Schema.Types.Mixed },
  rawValidationResponse: { type: Schema.Types.Mixed },
}, {
  timestamps: true,
  versionKey: false,
  toJSON: { transform: (_, ret) => { ret.id = ret._id; delete (ret as any)._id; return ret; } },
});

export const SubscriptionPayment = model<ISubscriptionPayment>('SubscriptionPayment', subscriptionPaymentSchema);
