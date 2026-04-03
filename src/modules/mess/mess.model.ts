import { Schema, model, Document } from 'mongoose';

export interface IMess extends Document {
  name: string;
  address: string;
  inviteCode: string;
  settings?: any;
  status: 'active' | 'suspended';
}

const messSchema = new Schema<IMess>({
  name: { type: String, required: true },
  address: { type: String, required: true },
  inviteCode: { type: String, required: true, unique: true },
  settings: { type: Schema.Types.Mixed },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' }
}, {
  timestamps: true, versionKey: false,
  toJSON: { transform: (_, ret) => { ret.id = ret._id; delete (ret as any)._id; return ret; } }
});

export const Mess = model<IMess>('Mess', messSchema);
