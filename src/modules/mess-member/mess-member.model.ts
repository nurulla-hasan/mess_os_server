import { Schema, model, Document, Types } from 'mongoose';

export interface IMessMember extends Document {
  messId: Types.ObjectId;
  userId: Types.ObjectId;
  messRole: 'manager' | 'member';
  status: 'pending' | 'active' | 'rejected' | 'removed';
  participation: {
    meals: boolean;
    sharedExpenses: boolean;
  };
  isResidentManager?: boolean;
  joinedAt?: Date;
  leftAt?: Date;
}

const reqSchema = new Schema<IMessMember>({
  messId: { type: Schema.Types.ObjectId, ref: 'Mess', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  messRole: { type: String, enum: ['manager', 'member'], default: 'member' },
  status: { type: String, enum: ['pending', 'active', 'rejected', 'removed'], default: 'pending' },
  participation: {
    meals: { type: Boolean, default: true },
    sharedExpenses: { type: Boolean, default: true },
  },
  isResidentManager: { type: Boolean, default: true },
  joinedAt: { type: Date },
  leftAt: { type: Date }
}, {
  timestamps: true, versionKey: false
});

reqSchema.index({ messId: 1, userId: 1 }, { unique: true });

export const MessMember = model<IMessMember>('MessMember', reqSchema);
