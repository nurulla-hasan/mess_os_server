import { Schema, model, Document } from 'mongoose';

export interface IMealOffRequest extends Document {
  messId: Schema.Types.ObjectId;
  messMemberId: Schema.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  approvedBy?: Schema.Types.ObjectId;
}

const mealOffRequestSchema = new Schema<IMealOffRequest>({
  messId: { type: Schema.Types.ObjectId, ref: 'Mess', required: true },
  messMemberId: { type: Schema.Types.ObjectId, ref: 'MessMember', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reason: { type: String },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' } // Audit constraint
}, { timestamps: true, versionKey: false, toJSON: { transform: (_, ret) => { ret.id = ret._id; delete ret._id; return ret; } } });

export const MealOffRequest = model<IMealOffRequest>('MealOffRequest', mealOffRequestSchema);
