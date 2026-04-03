import { Schema, model, Document, Types } from 'mongoose';

export interface IMemberBill extends Document {
  messId: Types.ObjectId;
  billingCycleId: Types.ObjectId;
  messMemberId: Types.ObjectId;
  summary: {
    meals: number;
    mealRate: number;
    mealCharge: number;
    equalShare: number;
    previousDue: number; // Running balance prior to this month start
    totalPaymentsAndCredits: number; // Any credits (payments, personal expenses) during this month
    finalPayable: number; // mealCharge + equalShare
    finalDue: number; // >0 means they owe
    finalAdvance: number; // >0 means they have extra credit
  };
  status: 'unpaid' | 'paid' | 'settled';
  isArchived: boolean;
}

const memberBillSchema = new Schema<IMemberBill>({
  messId: { type: Schema.Types.ObjectId, ref: 'Mess', required: true },
  billingCycleId: { type: Schema.Types.ObjectId, ref: 'BillingCycle', required: true },
  messMemberId: { type: Schema.Types.ObjectId, ref: 'MessMember', required: true },
  summary: {
    meals: { type: Number, required: true },
    mealRate: { type: Number, required: true },
    mealCharge: { type: Number, required: true },
    equalShare: { type: Number, required: true },
    previousDue: { type: Number, required: true },
    totalPaymentsAndCredits: { type: Number, required: true },
    finalPayable: { type: Number, required: true },
    finalDue: { type: Number, required: true },
    finalAdvance: { type: Number, required: true }
  },
  status: { type: String, enum: ['unpaid', 'paid', 'settled'], default: 'unpaid' },
  isArchived: { type: Boolean, default: false }
}, { timestamps: true, versionKey: false, toJSON: { transform: (_, ret) => { ret.id = ret._id; delete (ret as any)._id; return ret; } } });

memberBillSchema.index({ billingCycleId: 1, messMemberId: 1 });

export const MemberBill = model<IMemberBill>('MemberBill', memberBillSchema);
