import mongoose from 'mongoose';
import { MenuPlan } from './menu-plan.model';
import { isBeforeTodayDhaka, normalizeMealDate } from '../../shared/utils/dateUtils';
import { aiService } from '../../shared/services/aiService';
import { AppError } from '../../shared/utils/apiError';
import { Mess } from '../mess/mess.model';
import type { z } from 'zod';
import type { createMenuPlanSchema, updateMenuPlanSchema } from './menu-plan.validation';

export type MenuPlanStatus = 'draft' | 'published' | 'archived';

type CreateMenuPlanPayload = z.infer<typeof createMenuPlanSchema>['body'];
type UpdateMenuPlanPayload = z.infer<typeof updateMenuPlanSchema>['body'];

type ListMenuPlanOptions = {
  page?: number;
  limit?: number;
  status?: MenuPlanStatus;
  start?: string;
  end?: string;
};

const mapMealsToObject = (plan: Record<string, unknown>): Record<string, unknown> => {
  if (!plan?.meals) return plan;
  const meals = plan.meals instanceof Map ? Object.fromEntries(plan.meals as Map<string, unknown>) : plan.meals;
  return { ...plan, meals };
};

const getAllowedMealCategories = async (messId: string) => {
  const mess = await Mess.findById(messId).select('settings.mealCategories').lean();
  if (!mess) throw new AppError(404, 'Mess not found');
  return mess.settings?.mealCategories ?? [];
};

const getRecentMenuContext = async (messId: string, targetDate: Date, days: number) => {
  if (!days) return [];

  const start = new Date(targetDate.getTime() - days * 24 * 60 * 60 * 1000);
  const plans = await MenuPlan.find({
    messId,
    date: { $gte: start, $lt: targetDate },
    status: { $ne: 'archived' },
  }).select('date meals').sort({ date: -1 }).lean();

  return plans.map((plan) => ({
    date: plan.date,
    meals: (mapMealsToObject(plan).meals as Record<string, string>) ?? {},
  }));
};

const normalizeMenuMeals = async (messId: string, meals?: Record<string, string> | null) => {
  if (!meals) return meals ?? undefined;

  const allowedCategories = await getAllowedMealCategories(messId);
  const categoryByLowercase = new Map(allowedCategories.map((category) => [category.toLowerCase(), category]));
  const normalizedMeals: Record<string, string> = {};

  for (const [category, menu] of Object.entries(meals)) {
    const trimmedCategory = category.trim();
    const trimmedMenu = menu.trim();
    const canonicalCategory = categoryByLowercase.get(trimmedCategory.toLowerCase());
    if (!canonicalCategory) {
      throw new AppError(400, `Invalid meal category: ${trimmedCategory}. Allowed categories: ${allowedCategories.join(', ')}`);
    }
    normalizedMeals[canonicalCategory] = trimmedMenu;
  }

  return normalizedMeals;
};

export const createMenuPlan = async (messId: string, payload: CreateMenuPlanPayload, userId: string) => {
  const targetDate = normalizeMealDate(payload.date);
  if (isBeforeTodayDhaka(targetDate)) throw new AppError(400, 'Menu plan date cannot be in the past');

  let meals = payload.meals;
  const mealCategories = await getAllowedMealCategories(messId);
  
  if (payload.isAiGenerated) {
    const recentMeals = await getRecentMenuContext(messId, targetDate, payload.avoidRecentDays ?? 7);
    meals = await aiService.generateMenuPlanContent({
      date: targetDate,
      mealCategories,
      preference: payload.aiPreference,
      budget: payload.aiBudget,
      recentMeals,
    });
  }

  meals = await normalizeMenuMeals(messId, meals);
  
  const plan = await MenuPlan.create({
    messId,
    date: targetDate,
    meals,
    status: 'draft',
    isAiGenerated: payload.isAiGenerated,
    createdBy: new mongoose.Types.ObjectId(userId)
  });
  return mapMealsToObject(plan.toObject() as unknown as Record<string, unknown>);
};

export const getMenuPlans = async (messId: string, options: ListMenuPlanOptions = {}) => {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const query: Record<string, unknown> = { messId: new mongoose.Types.ObjectId(messId) };

  if (options.status) query.status = options.status;

  const start = options.start ? normalizeMealDate(options.start) : undefined;
  const end = options.end ? normalizeMealDate(options.end) : undefined;
  if (start || end) {
    query.date = {
      ...(start ? { $gte: start } : {}),
      ...(end ? { $lte: end } : {}),
    };
  }

  const [items, total] = await Promise.all([
    MenuPlan.find(query).sort({ date: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    MenuPlan.countDocuments(query),
  ]);

  return {
    items: items.map(mapMealsToObject),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const updateMenuPlan = async (messId: string, planId: string, payload: UpdateMenuPlanPayload) => {
  const meals = await normalizeMenuMeals(messId, payload.meals);
  const plan = await MenuPlan.findOneAndUpdate(
    { _id: planId, messId, status: { $ne: 'archived' } },
    { meals },
    { new: true, runValidators: true }
  ).lean();
  if (!plan) throw new AppError(404, 'Menu plan not found or archived');
  return mapMealsToObject(plan);
};

export const updateMenuPlanStatus = async (messId: string, planId: string, status: 'published' | 'archived') => {
  const plan = await MenuPlan.findOneAndUpdate(
    { _id: planId, messId },
    { status },
    { new: true, runValidators: true }
  ).lean();
  if (!plan) throw new AppError(404, 'Menu plan not found');
  return mapMealsToObject(plan);
};
