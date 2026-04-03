import { Schema, model, Document, Types } from 'mongoose';

export interface IPayment extends Document {
  messId: Types.ObjectId;
  messMemberId: Types.ObjectId;
  amount: number;
  method: string;
  reference?: string;
  status: 'pending' | 'approved' | 'rejected' | 'canceled';
  approvedBy?: Types.ObjectId;
  receivedDate?: Date;
}

const paymentSchema = new Schema<IPayment>({
  messId: { type: Schema.Types.ObjectId, ref: 'Mess', required: true },
  messMemberId: { type: Schema.Types.ObjectId, ref: 'MessMember', required: true },
  amount: { type: Number, required: true },
  method: { type: String, required: true },
  reference: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'canceled'], default: 'pending' },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  receivedDate: { type: Date }
}, { timestamps: true, versionKey: false, toJSON: { transform: (_, ret) => { ret.id = ret._id; delete (ret as any)._id; return ret; } } });

export const Payment = model<IPayment>('Payment', paymentSchema);
