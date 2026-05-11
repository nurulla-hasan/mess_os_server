import { Schema, model, Document, Types } from 'mongoose';

export interface IUtilityBill extends Document {
  messId: Types.ObjectId;
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
}, { timestamps: true, versionKey: false });

export const UtilityBill = model<IUtilityBill>('UtilityBill', utilityBillSchema);
