import { Schema, model, Document, Types } from 'mongoose';

export interface IMealOffRequest extends Document {
  messId: Types.ObjectId;
  messMemberId: Types.ObjectId;
  startDate: Date;
  endDate: Date;
  meals: string[];
  status: 'pending' | 'approved' | 'rejected' | 'canceled';
  reason?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
}

const mealOffRequestSchema = new Schema<IMealOffRequest>({
  messId: { type: Schema.Types.ObjectId, ref: 'Mess', required: true },
  messMemberId: { type: Schema.Types.ObjectId, ref: 'MessMember', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  meals: [{ type: String, trim: true }],
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'canceled'], default: 'pending' },
  reason: { type: String },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date }
}, { timestamps: true, versionKey: false });

export const MealOffRequest = model<IMealOffRequest>('MealOffRequest', mealOffRequestSchema);
