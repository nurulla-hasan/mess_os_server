import { Schema, model, Document, Types } from 'mongoose';
import { FUND_SOURCES } from '../../constants/ledgerEntryTypes';

export interface IExpense extends Document {
  messId: Types.ObjectId;
  category: string;
  amount: number;
  date: Date;
  paidBy: Types.ObjectId;
  fundSource: string;
  status: 'pending' | 'approved' | 'rejected' | 'canceled';
  reimbursementStatus: 'not_applicable' | 'pending' | 'reimbursed';
  receiptUrl?: string;
  receiptPublicId?: string;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
}

const expenseSchema = new Schema<IExpense>({
  messId: { type: Schema.Types.ObjectId, ref: 'Mess', required: true },
  category: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  paidBy: { type: Schema.Types.ObjectId, ref: 'MessMember', required: true },
  fundSource: { type: String, enum: Object.values(FUND_SOURCES), required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'canceled'], default: 'pending' },
  reimbursementStatus: { type: String, enum: ['not_applicable', 'pending', 'reimbursed'], default: 'not_applicable' },
  receiptUrl: { type: String },
  receiptPublicId: { type: String },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date }
}, { timestamps: true, versionKey: false, toJSON: { transform: (_, ret) => { ret.id = ret._id; delete (ret as any)._id; return ret; } } });

export const Expense = model<IExpense>('Expense', expenseSchema);
