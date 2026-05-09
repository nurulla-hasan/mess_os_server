import mongoose from 'mongoose';
import { Meal } from './meal.model';
import { DHAKA_OFFSET_MS, normalizeMealDate } from '../../shared/utils/dateUtils';
import { MessMember } from '../mess-member/mess-member.model';
import { BillingCycle } from '../billing/billing-cycle.model';
import { AppError } from '../../shared/utils/apiError';

export type ListMealsOptions = {
  page?: number;
  limit?: number;
  memberId?: string;
  start?: string;
  end?: string;
  requesterMemberId?: string;
  requesterRole?: 'manager' | 'member';
  isSuperAdmin?: boolean;
};

export type MealEntryPayload = {
  messMemberId: string;
  mealCount: number;
};

const getMonthYearFromMealDate = (mealDate: Date) => {
  const dhakaDate = new Date(mealDate.getTime() + DHAKA_OFFSET_MS);
  return {
    month: dhakaDate.getUTCMonth() + 1,
    year: dhakaDate.getUTCFullYear(),
  };
};

const assertBillingCycleEditable = async (messId: string, mealDate: Date) => {
  const { month, year } = getMonthYearFromMealDate(mealDate);
  const finalizedCycle = await BillingCycle.findOne({ messId, month, year, status: 'finalized' }).select('_id').lean();
  if (finalizedCycle) {
    throw new AppError(400, `Meals are locked because billing cycle ${month}/${year} is finalized. Reopen billing first.`);
  }
};

const assertActiveMemberInMess = async (messId: string, messMemberId: string) => {
  const member = await MessMember.findOne({ _id: messMemberId, messId, status: 'active' }).select('_id').lean();
  if (!member) throw new AppError(400, 'Active mess member not found for this mess');
};

const buildMealQuery = (messId: string, options: ListMealsOptions) => {
  const query: Record<string, unknown> = { messId: new mongoose.Types.ObjectId(messId) };

  if (options.requesterRole !== 'manager' && !options.isSuperAdmin) {
    if (!options.requesterMemberId) throw new AppError(403, 'Active member context is required');
    if (options.memberId && options.memberId !== options.requesterMemberId) {
      throw new AppError(403, 'Members can only view their own meal records');
    }
    query.messMemberId = new mongoose.Types.ObjectId(options.requesterMemberId);
  } else if (options.memberId) {
    query.messMemberId = new mongoose.Types.ObjectId(options.memberId);
  }

  const start = options.start ? normalizeMealDate(options.start) : undefined;
  const end = options.end ? normalizeMealDate(options.end) : undefined;

  if (start || end) {
    query.date = {
      ...(start ? { $gte: start } : {}),
      ...(end ? { $lte: end } : {}),
    };
  }

  return query;
};

export const createOrUpdateMeal = async (
  messId: string,
  messMemberId: string,
  dateStr: string,
  mealCount: number,
  managerId: string
) => {
  const targetDate = normalizeMealDate(dateStr);
  await assertBillingCycleEditable(messId, targetDate);
  await assertActiveMemberInMess(messId, messMemberId);

  return await Meal.findOneAndUpdate(
    { messId, messMemberId, date: targetDate },
    { mealCount, createdBy: new mongoose.Types.ObjectId(managerId) },
    { new: true, upsert: true, runValidators: true }
  ).populate({
    path: 'messMemberId',
    select: 'userId messRole status',
    populate: { path: 'userId', select: 'fullName email phone avatarUrl' },
  });
};

export const bulkCreateOrUpdateMeals = async (
  messId: string,
  dateStr: string,
  entries: MealEntryPayload[],
  managerId: string
) => {
  const targetDate = normalizeMealDate(dateStr);
  await assertBillingCycleEditable(messId, targetDate);

  const uniqueMemberIds = Array.from(new Set(entries.map((entry) => entry.messMemberId)));
  if (uniqueMemberIds.length !== entries.length) {
    throw new AppError(400, 'Duplicate messMemberId found in entries');
  }

  const activeMembers = await MessMember.find({
    _id: { $in: uniqueMemberIds },
    messId,
    status: 'active',
  }).select('_id').lean();

  if (activeMembers.length !== uniqueMemberIds.length) {
    throw new AppError(400, 'All meal entries must target active members of this mess');
  }

  await Meal.bulkWrite(entries.map((entry) => ({
    updateOne: {
      filter: { messId, messMemberId: entry.messMemberId, date: targetDate },
      update: { mealCount: entry.mealCount, createdBy: new mongoose.Types.ObjectId(managerId) },
      upsert: true,
    },
  })), { ordered: true });

  return await Meal.find({ messId, messMemberId: { $in: uniqueMemberIds }, date: targetDate })
    .populate({
      path: 'messMemberId',
      select: 'userId messRole status',
      populate: { path: 'userId', select: 'fullName email phone avatarUrl' },
    })
    .sort({ createdAt: -1 });
};

export const listMeals = async (messId: string, options: ListMealsOptions = {}) => {
  const page = options.page || 1;
  const limit = options.limit || 20;

  if (options.memberId) await assertActiveMemberInMess(messId, options.memberId);

  const query = buildMealQuery(messId, options);
  const [items, total, summary] = await Promise.all([
    Meal.find(query)
      .populate({
        path: 'messMemberId',
        select: 'userId messRole status',
        populate: { path: 'userId', select: 'fullName email phone avatarUrl' },
      })
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Meal.countDocuments(query),
    Meal.aggregate([
      { $match: query },
      { $group: { _id: null, totalMeals: { $sum: '$mealCount' }, totalRecords: { $sum: 1 } } },
    ]),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    summary: {
      totalMeals: summary[0]?.totalMeals ?? 0,
      totalRecords: summary[0]?.totalRecords ?? 0,
    },
  };
};
