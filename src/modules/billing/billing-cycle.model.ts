import { Schema, model, Document, Types } from 'mongoose';

export interface IBillingCycle extends Document {
  messId: Types.ObjectId;
  month: number;
  year: number;
  startDate: Date;
  endDate: Date;
  status: 'draft' | 'finalized';
  summary: {
    totalMeals: number;
    totalMealExpense: number;
    totalEqualShareExpense: number;
    mealRate: number;
  };
  finalizedAt?: Date;
  finalizedBy?: Types.ObjectId;
}

const billingCycleSchema = new Schema<IBillingCycle>({
  messId: { type: Schema.Types.ObjectId, ref: 'Mess', required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['draft', 'finalized'], default: 'draft' },
  summary: {
    totalMeals: { type: Number, default: 0 },
    totalMealExpense: { type: Number, default: 0 },
    totalEqualShareExpense: { type: Number, default: 0 },
    mealRate: { type: Number, default: 0 }
  },
  finalizedAt: { type: Date },
  finalizedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true, versionKey: false, toJSON: { transform: (_, ret) => { ret.id = ret._id; delete (ret as any)._id; return ret; } } });

billingCycleSchema.index({ messId: 1, month: 1, year: 1 }, { unique: true });

export const BillingCycle = model<IBillingCycle>('BillingCycle', billingCycleSchema);
