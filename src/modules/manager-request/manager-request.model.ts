import { Schema, model, Document, Types } from 'mongoose';

export interface IManagerRequest extends Document {
  userId: Types.ObjectId;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  adminNote?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
}

const managerRequestSchema = new Schema<IManagerRequest>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reason: { type: String },
  adminNote: { type: String },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
}, {
  timestamps: true,
  versionKey: false,
  toJSON: { transform: (_, ret) => { ret.id = ret._id; delete (ret as any)._id; return ret; } },
});

export const ManagerRequest = model<IManagerRequest>('ManagerRequest', managerRequestSchema);
