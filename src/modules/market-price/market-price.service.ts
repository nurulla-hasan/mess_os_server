import mongoose, { Types } from 'mongoose';
import { MarketPrice } from './market-price.model';
import { AppError } from '../../shared/utils/apiError';
import {
  UpsertMarketPricePayload,
  BulkUpsertMarketPricePayload,
} from './market-price.validation';

/** Get all market prices for a mess */
export const getMarketPrices = async (messId: string) => {
  return MarketPrice.find({ messId: new Types.ObjectId(messId) })
    .sort({ category: 1, itemName: 1 })
    .lean();
};

/** Create or update a single market price */
export const upsertMarketPrice = async (messId: string, payload: UpsertMarketPricePayload) => {
  const price = await MarketPrice.findOneAndUpdate(
    { messId: new Types.ObjectId(messId), itemName: payload.itemName },
    {
      $set: {
        messId: new Types.ObjectId(messId),
        itemName: payload.itemName,
        price: payload.price,
        unit: payload.unit ?? 'KG',
        category: payload.category ?? 'other',
      },
    },
    { upsert: true, new: true, runValidators: true }
  );
  return price;
};

/** Bulk upsert — replaces all prices for a mess with the given items */
export const bulkUpsertMarketPrices = async (messId: string, payload: BulkUpsertMarketPricePayload) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // Delete all existing prices for this mess
    await MarketPrice.deleteMany({ messId: new Types.ObjectId(messId) }, { session });

    // Insert new prices
    const items = payload.items.map((item) => ({
      messId: new Types.ObjectId(messId),
      itemName: item.itemName,
      price: item.price,
      unit: item.unit ?? 'KG',
      category: item.category ?? 'other',
    }));
    const prices = await MarketPrice.insertMany(items, { session });
    await session.commitTransaction();
    return prices;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

/** Delete a market price */
export const deleteMarketPrice = async (messId: string, itemName: string) => {
  const result = await MarketPrice.findOneAndDelete({
    messId: new Types.ObjectId(messId),
    itemName,
  });
  if (!result) throw new AppError(404, 'Market price not found');
  return result;
};

/** Reset to default Bangladeshi market prices */
export const DEFAULT_MARKET_PRICES: Array<{
  itemName: string;
  price: number;
  unit: string;
  category: string;
}> = [
  { itemName: 'ব্রয়লার মুরগি', price: 180, unit: 'KG', category: 'meat' },
  { itemName: 'দেশি মুরগি', price: 400, unit: 'KG', category: 'meat' },
  { itemName: 'গরুর মাংস', price: 750, unit: 'KG', category: 'meat' },
  { itemName: 'খাসির মাংস', price: 1100, unit: 'KG', category: 'meat' },
  { itemName: 'রুই মাছ', price: 350, unit: 'KG', category: 'meat' },
  { itemName: 'কাতলা মাছ', price: 380, unit: 'KG', category: 'meat' },
  { itemName: 'ইলিশ মাছ', price: 1400, unit: 'KG', category: 'meat' },
  { itemName: 'পাঙ্গাশ/তেলাপিয়া', price: 180, unit: 'KG', category: 'meat' },
  { itemName: 'ডিম', price: 140, unit: 'ডজন', category: 'dairy' },
  { itemName: 'পেঁয়াজ', price: 60, unit: 'KG', category: 'vegetables' },
  { itemName: 'আলু', price: 40, unit: 'KG', category: 'vegetables' },
  { itemName: 'টমেটো', price: 80, unit: 'KG', category: 'vegetables' },
  { itemName: 'রসুন', price: 200, unit: 'KG', category: 'spices' },
  { itemName: 'আদা', price: 180, unit: 'KG', category: 'spices' },
  { itemName: 'তেল', price: 180, unit: 'লিটার', category: 'bazar' },
  { itemName: 'চাল', price: 60, unit: 'KG', category: 'bazar' },
  { itemName: 'ডাল', price: 140, unit: 'KG', category: 'bazar' },
  { itemName: 'বেগুন', price: 50, unit: 'KG', category: 'vegetables' },
  { itemName: 'লাউ', price: 40, unit: 'টুকরা', category: 'vegetables' },
  { itemName: 'কুমড়া', price: 40, unit: 'KG', category: 'vegetables' },
  { itemName: 'শাক', price: 20, unit: 'আঁটি', category: 'vegetables' },
  { itemName: 'পটল', price: 50, unit: 'KG', category: 'vegetables' },
  { itemName: 'শসা', price: 40, unit: 'KG', category: 'vegetables' },
  { itemName: 'কাঁচা মরিচ', price: 120, unit: 'KG', category: 'spices' },
  { itemName: 'লেবু', price: 20, unit: 'হালি', category: 'vegetables' },
];

export const resetMarketPricesToDefault = async (messId: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    await MarketPrice.deleteMany({ messId: new Types.ObjectId(messId) }, { session });
    const items = DEFAULT_MARKET_PRICES.map((item) => ({
      messId: new Types.ObjectId(messId),
      ...item,
    }));
    const prices = await MarketPrice.insertMany(items, { session });
    await session.commitTransaction();
    return prices;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};
