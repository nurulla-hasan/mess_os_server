import { Schema, model, Document, Types } from 'mongoose';

export interface IMenuPlan extends Document {
  messId: Types.ObjectId;
  date: Date;
  meals: {
    breakfast?: string;
    lunch?: string;
    dinner?: string;
  };
  status: 'draft' | 'published' | 'archived';
  isAiGenerated: boolean;
  createdBy: Types.ObjectId;
}

const menuPlanSchema = new Schema<IMenuPlan>({
  messId: { type: Schema.Types.ObjectId, ref: 'Mess', required: true },
  date: { type: Date, required: true },
  meals: {
    breakfast: String,
    lunch: String,
    dinner: String
  },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  isAiGenerated: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true,
  versionKey: false,
  toJSON: { transform: (_, ret) => { ret.id = ret._id; delete (ret as any)._id; return ret; } }
});

menuPlanSchema.index({ messId: 1, date: 1 });

export const MenuPlan = model<IMenuPlan>('MenuPlan', menuPlanSchema);
