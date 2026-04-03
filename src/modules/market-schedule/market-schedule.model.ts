import { Schema, model, Document, Types } from 'mongoose';

export interface IMarketSchedule extends Document {
  messId: Types.ObjectId;
  assignedTo: Types.ObjectId[];
  targetDate: Date;
  shoppingItems: { name: string; quantity: string; }[];
  estimatedBudget: number;
  actualSpent?: number;
  status: 'pending' | 'completed' | 'reassigned' | 'void';
  expenseId?: Types.ObjectId;
  completedAt?: Date;
  completedBy?: Types.ObjectId;
  createdBy: Types.ObjectId;
}

const scheduleSchema = new Schema<IMarketSchedule>({
  messId: { type: Schema.Types.ObjectId, ref: 'Mess', required: true },
  assignedTo: [{ type: Schema.Types.ObjectId, ref: 'MessMember', required: true }],
  targetDate: { type: Date, required: true },
  shoppingItems: [{ name: String, quantity: String }],
  estimatedBudget: { type: Number, required: true },
  actualSpent: { type: Number },
  status: { type: String, enum: ['pending', 'completed', 'reassigned', 'void'], default: 'pending' },
  expenseId: { type: Schema.Types.ObjectId, ref: 'Expense' },
  completedAt: { type: Date },
  completedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true,
  versionKey: false,
  toJSON: { transform: (_, ret) => { ret.id = ret._id; delete (ret as any)._id; return ret; } }
});

scheduleSchema.index({ messId: 1, targetDate: 1 });

export const MarketSchedule = model<IMarketSchedule>('MarketSchedule', scheduleSchema);
