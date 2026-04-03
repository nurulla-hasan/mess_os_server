import { Schema, model, Document, Types } from 'mongoose';

export interface IAiShoppingList extends Document {
  messId: Types.ObjectId;
  menuPlanId: Types.ObjectId;
  targetDate: Date;
  items: { name: string; quantity: string; category: string }[];
  status: 'draft' | 'approved' | 'rejected' | 'converted';
  marketScheduleId?: Types.ObjectId;
  createdBy: Types.ObjectId;
}

const aiShoppingSchema = new Schema<IAiShoppingList>({
  messId: { type: Schema.Types.ObjectId, ref: 'Mess', required: true },
  menuPlanId: { type: Schema.Types.ObjectId, ref: 'MenuPlan', required: true },
  targetDate: { type: Date, required: true },
  items: [{
    name: { type: String, required: true },
    quantity: { type: String, required: true },
    category: { type: String, required: true }
  }],
  status: { type: String, enum: ['draft', 'approved', 'rejected', 'converted'], default: 'draft' },
  marketScheduleId: { type: Schema.Types.ObjectId, ref: 'MarketSchedule' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true,
  versionKey: false,
  toJSON: { transform: (_, ret) => { ret.id = ret._id; delete (ret as any)._id; return ret; } }
});

aiShoppingSchema.index({ messId: 1, menuPlanId: 1 });

export const AiShoppingList = model<IAiShoppingList>('AiShoppingList', aiShoppingSchema);
