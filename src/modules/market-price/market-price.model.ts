import { Schema, model, Document, Types } from 'mongoose';

export interface IMarketPrice extends Document {
  messId: Types.ObjectId;
  itemName: string;
  price: number;
  unit: string;
  category: string;
}

const marketPriceSchema = new Schema<IMarketPrice>({
  messId: { type: Schema.Types.ObjectId, ref: 'Mess', required: true },
  itemName: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  unit: { type: String, default: 'KG' },
  category: {
    type: String,
    enum: ['bazar', 'meat', 'vegetables', 'dairy', 'spices', 'other'],
    default: 'other',
  },
}, { timestamps: true, versionKey: false });

marketPriceSchema.index({ messId: 1, itemName: 1 }, { unique: true });

export const MarketPrice = model<IMarketPrice>('MarketPrice', marketPriceSchema);
