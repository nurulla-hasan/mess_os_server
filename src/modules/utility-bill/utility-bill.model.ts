import { Schema, model, Document } from 'mongoose';

export interface IUtilityBill extends Document {
  messId: Schema.Types.ObjectId;
  category: string;
  amount: number;
  billingMonth: number;
  year: number;
  dueDate?: Date;
  status: 'unpaid' | 'paid';
}

const utilityBillSchema = new Schema<IUtilityBill>({
  messId: { type: Schema.Types.ObjectId, ref: 'Mess', required: true },
  category: { type: String, required: true },
  amount: { type: Number, required: true },
  billingMonth: { type: Number, required: true },
  year: { type: Number, required: true },
  dueDate: { type: Date },
  status: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' }
}, { timestamps: true, versionKey: false, toJSON: { transform: (_, ret) => { ret.id = ret._id; delete ret._id; return ret; } } });

export const UtilityBill = model<IUtilityBill>('UtilityBill', utilityBillSchema);
