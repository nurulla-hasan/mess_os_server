import { Schema, model, Document, Types } from 'mongoose';

export interface IMess extends Document {
  name: string;
  address: string;
  inviteCode: string;
  settings?: {
    mealCategories?: string[];
    equalShareCategories?: string[];
  };
  status: 'active' | 'suspended';
  suspensionNote?: string;
  suspendedAt?: Date;
  suspendedBy?: Types.ObjectId;
}

const messSchema = new Schema<IMess>({
  name: { type: String, required: true },
  address: { type: String, required: true },
  inviteCode: { type: String, required: true, unique: true },
  settings: { type: Schema.Types.Mixed },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  suspensionNote: { type: String },
  suspendedAt: { type: Date },
  suspendedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true, versionKey: false
});

export const Mess = model<IMess>('Mess', messSchema);
