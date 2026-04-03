import { Schema, model, Document } from 'mongoose';

export interface IComplaint extends Document {
  messId: Schema.Types.ObjectId;
  messMemberId: Schema.Types.ObjectId;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'rejected';
  resolvedNote?: string;
  resolvedAt?: Date;
  resolvedBy?: Schema.Types.ObjectId;
}

const complaintSchema = new Schema<IComplaint>({
  messId: { type: Schema.Types.ObjectId, ref: 'Mess', required: true },
  messMemberId: { type: Schema.Types.ObjectId, ref: 'MessMember', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ['open', 'in_progress', 'resolved', 'rejected'], default: 'open' },
  resolvedNote: { type: String },
  resolvedAt: { type: Date },
  resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
  versionKey: false,
  toJSON: { transform: (_, ret) => { ret.id = ret._id; delete ret._id; return ret; } }
});

complaintSchema.index({ messId: 1, status: 1 });

export const Complaint = model<IComplaint>('Complaint', complaintSchema);
