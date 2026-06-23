import { Schema, model, Document, Types } from 'mongoose';

export interface IResidentToggleRequest extends Document {
  messId: Types.ObjectId;
  managerId: Types.ObjectId; // the manager whose status is being changed
  requestedBy: Types.ObjectId; // MessMember _id who initiated the request
  status: 'pending' | 'approved' | 'rejected';
  acceptedBy: Types.ObjectId[]; // members who accepted (min 3 to approve)
  createdAt: Date;
  updatedAt: Date;
}

const residentToggleRequestSchema = new Schema<IResidentToggleRequest>({
  messId: { type: Schema.Types.ObjectId, ref: 'Mess', required: true },
  managerId: { type: Schema.Types.ObjectId, ref: 'MessMember', required: true },
  requestedBy: { type: Schema.Types.ObjectId, ref: 'MessMember', required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  acceptedBy: [{ type: Schema.Types.ObjectId, ref: 'MessMember' }],
}, {
  timestamps: true, versionKey: false,
});

residentToggleRequestSchema.index({ messId: 1, status: 1 });
residentToggleRequestSchema.index({ managerId: 1, status: 1 });

export const ResidentToggleRequest = model<IResidentToggleRequest>('ResidentToggleRequest', residentToggleRequestSchema);
