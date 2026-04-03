import { Schema, model, Document } from 'mongoose';

export interface IMeal extends Document {
  messId: Schema.Types.ObjectId;
  messMemberId: Schema.Types.ObjectId;
  date: Date;
  mealCount: number;
  createdBy: Schema.Types.ObjectId;
}

const mealSchema = new Schema<IMeal>({
  messId: { type: Schema.Types.ObjectId, ref: 'Mess', required: true },
  messMemberId: { type: Schema.Types.ObjectId, ref: 'MessMember', required: true },
  date: { type: Date, required: true },
  mealCount: { type: Number, required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true } // Audit constraint
}, { timestamps: true, versionKey: false, toJSON: { transform: (_, ret) => { ret.id = ret._id; delete ret._id; return ret; } } });

mealSchema.index({ messId: 1, messMemberId: 1, date: 1 }, { unique: true });

export const Meal = model<IMeal>('Meal', mealSchema);
