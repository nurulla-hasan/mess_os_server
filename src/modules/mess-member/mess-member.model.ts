import { Schema, model, Document, Types } from 'mongoose';

export interface IMessMember extends Document {
  messId: Types.ObjectId;
  userId: Types.ObjectId;
  messRole: 'manager' | 'member';
  status: 'pending' | 'active' | 'rejected' | 'removed';
  joinedAt?: Date;
  leftAt?: Date;
}

const reqSchema = new Schema<IMessMember>({
  messId: { type: Schema.Types.ObjectId, ref: 'Mess', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  messRole: { type: String, enum: ['manager', 'member'], default: 'member' },
  status: { type: String, enum: ['pending', 'active', 'rejected', 'removed'], default: 'pending' },
  joinedAt: { type: Date },
  leftAt: { type: Date }
}, {
  timestamps: true, versionKey: false,
  toJSON: { transform: (_, ret) => { ret.id = ret._id; delete (ret as any)._id; return ret; } }
});

export const MessMember = model<IMessMember>('MessMember', reqSchema);
