/**
 * @deprecated Use ResidentToggleRequest instead (resident-toggle-request.model.ts).
 * This model is kept as a stub to avoid broken imports.
 */
import { Schema, model, Document, Types } from 'mongoose';

export interface IResidentToggleVote extends Document {
  messId: Types.ObjectId;
  managerId: Types.ObjectId;
}

const residentToggleVoteSchema = new Schema<IResidentToggleVote>({
  messId: { type: Schema.Types.ObjectId, ref: 'Mess', required: true },
  managerId: { type: Schema.Types.ObjectId, ref: 'MessMember', required: true },
}, { versionKey: false });

export const ResidentToggleVote = model<IResidentToggleVote>('ResidentToggleVote', residentToggleVoteSchema);
