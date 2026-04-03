import mongoose from 'mongoose';
import { MenuPlan } from './menu-plan.model';
import { normalizeMealDate } from '../../shared/utils/dateUtils';
import { aiService } from '../../shared/services/aiService';
import { AppError } from '../../shared/utils/apiError';

export const createMenuPlan = async (messId: string, payload: any, userId: string) => {
  const targetDate = normalizeMealDate(payload.date);
  let meals = payload.meals;
  
  if (payload.isAiGenerated) {
    meals = await aiService.generateMenuPlanContent(targetDate);
  }
  
  return await MenuPlan.create({
    messId,
    date: targetDate,
    meals,
    status: 'draft',
    isAiGenerated: payload.isAiGenerated,
    createdBy: new mongoose.Types.ObjectId(userId)
  });
};

export const getMenuPlans = async (messId: string) => {
  return await MenuPlan.find({ messId }).sort({ date: -1 });
};

export const getMenuPlanById = async (messId: string, planId: string) => {
  const plan = await MenuPlan.findOne({ _id: planId, messId });
  if (!plan) throw new AppError(404, 'Menu plan not found');
  return plan;
};

export const getMenuPlanByDate = async (messId: string, dateStr: string) => {
  const plan = await MenuPlan.findOne({ messId, date: normalizeMealDate(dateStr) });
  if (!plan) throw new AppError(404, 'Menu plan not found for date');
  return plan;
};

export const updateMenuPlan = async (messId: string, planId: string, payload: any) => {
  const plan = await MenuPlan.findOneAndUpdate(
    { _id: planId, messId },
    { meals: payload.meals },
    { new: true, runValidators: true }
  );
  if (!plan) throw new AppError(404, 'Menu plan not found');
  return plan;
};

export const publishMenuPlan = async (messId: string, planId: string) => {
  const plan = await MenuPlan.findOneAndUpdate(
    { _id: planId, messId },
    { status: 'published' },
    { new: true, runValidators: true }
  );
  if (!plan) throw new AppError(404, 'Menu plan not found');
  return plan;
};

export const archiveMenuPlan = async (messId: string, planId: string) => {
  const plan = await MenuPlan.findOneAndUpdate(
    { _id: planId, messId },
    { status: 'archived' },
    { new: true, runValidators: true }
  );
  if (!plan) throw new AppError(404, 'Menu plan not found');
  return plan;
};
