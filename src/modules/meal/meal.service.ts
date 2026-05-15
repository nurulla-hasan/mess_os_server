import mongoose from 'mongoose';
import { Meal } from './meal.model';
import { DHAKA_OFFSET_MS, isAfterTodayDhaka, normalizeMealDate } from '../../shared/utils/dateUtils';
import { MessMember } from '../mess-member/mess-member.model';
import { AppError } from '../../shared/utils/apiError';
import { User } from '../user/user.model';
import { isValidObjectId } from 'mongoose';
import { Mess } from '../mess/mess.model';
import { MealOffRequest } from '../meal-off-request/meal-off-request.model';
import { assertBillingCycleOpenForDate } from '../billing/billing-lock.service';

export type ListMealsOptions = {
  page?: number;
  limit?: number;
  memberId?: string;
  scope?: 'all' | 'my';
  searchTerm?: string;
  start?: string;
  end?: string;
  requesterMemberId?: string;
  requesterRole?: 'manager' | 'member';
  isSuperAdmin?: boolean;
};

export type MealEntryPayload = {
  messMemberId: string;
  mealCount?: number;
  meals?: Record<string, number>;
};

const EXTRA_MEAL_CATEGORIES = ['Guest'];
const MAX_REGULAR_MEALS_PER_DAY = 3;
const MAX_TOTAL_MEALS_PER_DAY = 50;

const getMonthYearFromMealDate = (mealDate: Date) => {
  const dhakaDate = new Date(mealDate.getTime() + DHAKA_OFFSET_MS);
  return {
    month: dhakaDate.getUTCMonth() + 1,
    year: dhakaDate.getUTCFullYear(),
  };
};

const assertBillingCycleEditable = async (messId: string, mealDate: Date) => {
  const { month, year } = getMonthYearFromMealDate(mealDate);
  await assertBillingCycleOpenForDate(
    messId,
    mealDate,
    `Meals are locked because billing cycle ${month}/${year} is finalized. Reopen billing first.`
  );
};

const assertActiveMemberInMess = async (messId: string, messMemberId: string) => {
  const member = await MessMember.findOne({ _id: messMemberId, messId, status: 'active' }).select('_id').lean();
  if (!member) throw new AppError(400, 'Active mess member not found for this mess');
};

const assertMealParticipantInMess = async (messId: string, messMemberId: string) => {
  const member = await MessMember.findOne({ _id: messMemberId, messId, status: 'active' }).select('_id participation').lean();
  if (!member) throw new AppError(400, 'Active mess member not found for this mess');
  if (member.participation?.meals === false) {
    throw new AppError(400, 'Meal cannot be logged because this member does not participate in mess meals');
  }
};

const hasMealOffConflict = (requestMeals: string[] | undefined, mealCategories?: string[]) => {
  if (!requestMeals?.length || !mealCategories?.length) return true;
  const requestedSet = new Set(requestMeals.map((meal) => meal.toLowerCase()));
  return mealCategories.some((meal) => requestedSet.has(meal.toLowerCase()));
};

const assertNoApprovedMealOff = async (messId: string, messMemberId: string, mealDate: Date, meals?: Record<string, number>) => {
  const mealOffRequests = await MealOffRequest.find({
    messId,
    messMemberId,
    status: 'approved',
    startDate: { $lte: mealDate },
    endDate: { $gte: mealDate },
  }).select('_id meals').lean();

  if (!mealOffRequests.length) return;

  const mealCategories = meals ? Object.keys(meals).filter((category) => Number(meals[category] || 0) > 0) : undefined;
  const conflictingRequest = mealOffRequests.find((request) => hasMealOffConflict(request.meals, mealCategories));

  if (conflictingRequest) {
    const blockedMeals = conflictingRequest.meals?.length ? ` (${conflictingRequest.meals.join(', ')})` : '';
    throw new AppError(400, `Meal cannot be logged because this member has an approved meal-off request${blockedMeals} for this date. Cancel the meal-off request first.`);
  }
};

const assertNoApprovedMealOffForBulk = async (messId: string, entries: MealEntryPayload[], mealDate: Date) => {
  const messMemberIds = entries.map((entry) => entry.messMemberId);
  const mealOffRequests = await MealOffRequest.find({
    messId,
    messMemberId: { $in: messMemberIds },
    status: 'approved',
    startDate: { $lte: mealDate },
    endDate: { $gte: mealDate },
  }).select('messMemberId meals').lean();

  const entryByMemberId = new Map(entries.map((entry) => [entry.messMemberId, entry]));
  const blockedMemberIds = mealOffRequests
    .filter((request) => {
      const entry = entryByMemberId.get(String(request.messMemberId));
      const mealCategories = entry?.meals
        ? Object.keys(entry.meals).filter((category) => Number(entry.meals?.[category] || 0) > 0)
        : undefined;
      return hasMealOffConflict(request.meals, mealCategories);
    })
    .map((request) => String(request.messMemberId));

  if (blockedMemberIds.length) {
    throw new AppError(400, `Meal cannot be logged because approved meal off requests exist for these members on this date: ${blockedMemberIds.join(', ')}. Cancel meal off requests first.`);
  }
};

const getAllowedMealCategories = async (messId: string) => {
  const mess = await Mess.findById(messId).select('settings.mealCategories').lean();
  if (!mess) throw new AppError(404, 'Mess not found');
  return [...(mess.settings?.mealCategories ?? []), ...EXTRA_MEAL_CATEGORIES];
};

const getRegularMealTotal = (meals: Record<string, number>) => {
  return Object.entries(meals)
    .filter(([category]) => category.toLowerCase() !== 'guest')
    .reduce((sum, [, count]) => sum + count, 0);
};

const normalizeMealsBreakdown = async (messId: string, meals: Record<string, number>) => {
  const allowedCategories = await getAllowedMealCategories(messId);
  const allowedCategorySet = new Set(allowedCategories.map((category) => category.toLowerCase()));
  const normalizedMeals: Record<string, number> = {};

  for (const [category, count] of Object.entries(meals)) {
    const trimmedCategory = category.trim();
    if (!trimmedCategory) throw new AppError(400, 'Meal category cannot be empty');
    if (allowedCategorySet.size && !allowedCategorySet.has(trimmedCategory.toLowerCase())) {
      throw new AppError(400, `Invalid meal category: ${trimmedCategory}. Allowed categories: ${allowedCategories.join(', ')}`);
    }
    normalizedMeals[trimmedCategory] = count;
  }

  return { allowedCategories, normalizedMeals };
};

const assertMealTotals = (normalizedMeals: Record<string, number>) => {
  const calculatedMealCount = Object.values(normalizedMeals).reduce((sum, count) => sum + count, 0);
  const regularMealCount = getRegularMealTotal(normalizedMeals);

  if (regularMealCount > MAX_REGULAR_MEALS_PER_DAY) {
    throw new AppError(400, `Regular meal count cannot be greater than ${MAX_REGULAR_MEALS_PER_DAY}`);
  }

  if (calculatedMealCount > MAX_TOTAL_MEALS_PER_DAY) {
    throw new AppError(400, `Total meal count including guest cannot be greater than ${MAX_TOTAL_MEALS_PER_DAY}`);
  }

  return calculatedMealCount;
};

const normalizeMealPayload = async (messId: string, mealCount?: number, meals?: Record<string, number>) => {
  if (!meals) return { mealCount: mealCount ?? 0, meals: {} };

  const { normalizedMeals } = await normalizeMealsBreakdown(messId, meals);
  const calculatedMealCount = assertMealTotals(normalizedMeals);

  if (mealCount !== undefined && mealCount !== calculatedMealCount) {
    throw new AppError(400, 'mealCount must match the sum of meals breakdown');
  }

  return { mealCount: calculatedMealCount, meals: normalizedMeals };
};

const normalizeMealPayloads = async (messId: string, entries: MealEntryPayload[]) => {
  return Promise.all(entries.map(async (entry) => {
    if (!entry.meals) return { ...entry, mealCount: entry.mealCount ?? 0, meals: {} };

    const { normalizedMeals } = await normalizeMealsBreakdown(messId, entry.meals);
    const calculatedMealCount = assertMealTotals(normalizedMeals);
    if (entry.mealCount !== undefined && entry.mealCount !== calculatedMealCount) {
      throw new AppError(400, 'mealCount must match the sum of meals breakdown');
    }

    return { ...entry, mealCount: calculatedMealCount, meals: normalizedMeals };
  }));
};

const buildMealQuery = (messId: string, options: ListMealsOptions) => {
  const query: Record<string, unknown> = { messId: new mongoose.Types.ObjectId(messId) };
  const isMyScope = options.scope === 'my';

  if (isMyScope) {
    if (!options.requesterMemberId) throw new AppError(403, 'Active member context is required');
    query.messMemberId = new mongoose.Types.ObjectId(options.requesterMemberId);
  } else if (options.requesterRole !== 'manager' && !options.isSuperAdmin) {
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

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const applyMemberSearch = async (messId: string, query: Record<string, unknown>, searchTerm?: string) => {
  if (!searchTerm?.trim() || query.messMemberId) return true;

  const trimmedSearchTerm = searchTerm.trim();
  const regex = new RegExp(escapeRegExp(trimmedSearchTerm), 'i');
  const users = await User.find({
    $or: [
      { fullName: regex },
      { email: regex },
      { phone: regex },
    ],
  }).select('_id').lean();

  const memberQuery: Record<string, unknown> = { messId };
  const memberOrConditions: Record<string, unknown>[] = [];

  if (users.length) {
    memberOrConditions.push({ userId: { $in: users.map((user) => user._id) } });
  }

  if (isValidObjectId(trimmedSearchTerm)) {
    memberOrConditions.push({ _id: new mongoose.Types.ObjectId(trimmedSearchTerm) });
  }

  if (!memberOrConditions.length) return false;

  memberQuery.$or = memberOrConditions;
  const members = await MessMember.find(memberQuery).select('_id').lean();

  if (!members.length) return false;

  query.messMemberId = { $in: members.map((member) => member._id) };
  return true;
};

export const createOrUpdateMeal = async (
  messId: string,
  messMemberId: string,
  dateStr: string,
  mealCount: number | undefined,
  meals: Record<string, number> | undefined,
  managerId: string
) => {
  const targetDate = normalizeMealDate(dateStr);
  if (isAfterTodayDhaka(targetDate)) throw new AppError(400, 'Meal cannot be logged for a future date');
  await assertBillingCycleEditable(messId, targetDate);
  await assertMealParticipantInMess(messId, messMemberId);
  const normalizedPayload = await normalizeMealPayload(messId, mealCount, meals);
  await assertNoApprovedMealOff(messId, messMemberId, targetDate, normalizedPayload.meals);

  return await Meal.findOneAndUpdate(
    { messId, messMemberId, date: targetDate },
    { ...normalizedPayload, createdBy: new mongoose.Types.ObjectId(managerId) },
    { new: true, upsert: true, runValidators: true }
  ).populate({
    path: 'messMemberId',
    select: 'userId messRole status participation',
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
  if (isAfterTodayDhaka(targetDate)) throw new AppError(400, 'Meals cannot be logged for a future date');
  await assertBillingCycleEditable(messId, targetDate);

  const uniqueMemberIds = Array.from(new Set(entries.map((entry) => entry.messMemberId)));
  if (uniqueMemberIds.length !== entries.length) {
    throw new AppError(400, 'Duplicate messMemberId found in entries');
  }

  const activeMembers = await MessMember.find({
    _id: { $in: uniqueMemberIds },
    messId,
    status: 'active',
  }).select('_id participation').lean();

  if (activeMembers.length !== uniqueMemberIds.length) {
    throw new AppError(400, 'All meal entries must target active members of this mess');
  }

  const nonMealParticipantIds = activeMembers
    .filter((member) => member.participation?.meals === false)
    .map((member) => String(member._id));

  if (nonMealParticipantIds.length) {
    throw new AppError(400, `Meal cannot be logged because these members do not participate in mess meals: ${nonMealParticipantIds.join(', ')}`);
  }

  const normalizedEntries = await normalizeMealPayloads(messId, entries);
  await assertNoApprovedMealOffForBulk(messId, normalizedEntries, targetDate);

  await Meal.bulkWrite(normalizedEntries.map((entry) => ({
    updateOne: {
      filter: { messId, messMemberId: entry.messMemberId, date: targetDate },
      update: { mealCount: entry.mealCount, meals: entry.meals, createdBy: new mongoose.Types.ObjectId(managerId) },
      upsert: true,
    },
  })), { ordered: true });

  return await Meal.find({ messId, messMemberId: { $in: uniqueMemberIds }, date: targetDate })
    .populate({
      path: 'messMemberId',
      select: 'userId messRole status participation',
      populate: { path: 'userId', select: 'fullName email phone avatarUrl' },
    })
    .sort({ createdAt: -1 });
};

export const listMeals = async (messId: string, options: ListMealsOptions = {}) => {
  const page = options.page || 1;
  const limit = options.limit || 20;

  if (options.memberId) await assertActiveMemberInMess(messId, options.memberId);

  const query = buildMealQuery(messId, options);
  const hasSearchMatches = await applyMemberSearch(messId, query, options.searchTerm);
  if (!hasSearchMatches) {
    return {
      items: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
      summary: { totalMeals: 0, totalRecords: 0 },
    };
  }

  const [items, total, summary] = await Promise.all([
    Meal.find(query)
      .populate({
        path: 'messMemberId',
        select: 'userId messRole status participation',
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
