import { Meal } from './meal.model';
import { normalizeMealDate } from '../../shared/utils/dateUtils';
import mongoose from 'mongoose';

export const createOrUpdateMeal = async (messId: string, messMemberId: string, dateStr: string, mealCount: number, managerId: string) => {
  const targetDate = normalizeMealDate(dateStr);
  return await Meal.findOneAndUpdate(
    { messId, messMemberId, date: targetDate },
    { mealCount, createdBy: new mongoose.Types.ObjectId(managerId) },
    { new: true, upsert: true, runValidators: true }
  );
};

export const listMeals = async (messId: string) => {
  return await Meal.find({ messId }).sort({ date: -1 });
};
