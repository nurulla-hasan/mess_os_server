import { Schema, model, Document, Types } from 'mongoose';

export interface INotice extends Document {
  messId: Types.ObjectId;
  title: string;
  content: string;
  isPinned: boolean;
  status: 'active' | 'archived';
  createdBy: Types.ObjectId;
}

const noticeSchema = new Schema<INotice>({
  messId: { type: Schema.Types.ObjectId, ref: 'Mess', required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  isPinned: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'archived'], default: 'active' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true,
  versionKey: false,
  toJSON: { transform: (_, ret) => { ret.id = ret._id; delete (ret as any)._id; return ret; } }
});

noticeSchema.index({ messId: 1, status: 1 });
noticeSchema.index({ messId: 1, isPinned: -1, createdAt: -1 });

export const Notice = model<INotice>('Notice', noticeSchema);
