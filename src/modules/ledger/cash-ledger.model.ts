import { Schema, model, Document } from 'mongoose';
import { CASH_TRANSACTION_TYPES, REFERENCE_TYPES } from '../../constants/ledgerEntryTypes';

export interface ICashLedger extends Document {
  messId: Schema.Types.ObjectId;
  type: string;
  amount: number;
  referenceType: string;
  referenceId: Schema.Types.ObjectId;
  description: string;
  date: Date;
  isVoided: boolean;
}

const cashLedgerSchema = new Schema<ICashLedger>({
  messId: { type: Schema.Types.ObjectId, ref: 'Mess', required: true },
  type: { type: String, enum: Object.values(CASH_TRANSACTION_TYPES), required: true },
  amount: { type: Number, required: true },
  referenceType: { type: String, enum: Object.values(REFERENCE_TYPES), required: true },
  referenceId: { type: Schema.Types.ObjectId, required: true },
  description: { type: String, required: true },
  date: { type: Date, required: true },
  isVoided: { type: Boolean, default: false }
}, { timestamps: true, versionKey: false, toJSON: { transform: (_, ret) => { ret.id = ret._id; delete ret._id; return ret; } } });

cashLedgerSchema.index({ messId: 1, date: -1 });

export const CashLedger = model<ICashLedger>('CashLedger', cashLedgerSchema);
