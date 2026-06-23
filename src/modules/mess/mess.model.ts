import { Schema, model, Document, Types } from 'mongoose';

export interface IMessSettings {
  mealCategories: string[];
  equalShareCategories: string[];
}

export interface IMess extends Document {
  name: string;
  address: string;
  inviteCode: string;
  settings: IMessSettings;
  status: 'active' | 'suspended';
  suspensionNote?: string;
  suspendedAt?: Date;
  suspendedBy?: Types.ObjectId;
}

const messSchema = new Schema<IMess>({
  name: { type: String, required: true },
  address: { type: String, required: true },
  inviteCode: { type: String, required: true, unique: true },
  settings: {
    type: new Schema<IMessSettings>({
      mealCategories: { type: [String], default: ['Breakfast', 'Lunch', 'Dinner'] },
      equalShareCategories: { type: [String], default: ['rent', 'wifi', 'electricity', 'water', 'gas', 'bua'] },
    }),
    default: {},
  },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  suspensionNote: { type: String },
  suspendedAt: { type: Date },
  suspendedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true, versionKey: false
});

export const Mess = model<IMess>('Mess', messSchema);
