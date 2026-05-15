import { MealOffRequest } from './meal-off-request.model';
import { Meal } from '../meal/meal.model';
import { MessMember } from '../mess-member/mess-member.model';
import { User } from '../user/user.model';
import { Mess } from '../mess/mess.model';
import { AppError } from '../../shared/utils/apiError';
import { generateDateRange, getTodayDhakaNormalized, normalizeMealDate } from '../../shared/utils/dateUtils';
import mongoose, { isValidObjectId } from 'mongoose';

export type MealOffRequestStatus = 'pending' | 'approved' | 'rejected' | 'canceled';

export type ListMealOffRequestsOptions = {
  page?: number;
  limit?: number;
  status?: MealOffRequestStatus;
  scope?: 'all' | 'my';
  messMemberId?: string;
  searchTerm?: string;
  start?: string;
  end?: string;
  requesterMemberId?: string;
  requesterRole?: 'manager' | 'member';
  isSuperAdmin?: boolean;
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getMealCategories = async (messId: string) => {
  const mess = await Mess.findById(messId).select('settings.mealCategories').lean();
  if (!mess) throw new AppError(404, 'Mess not found');
  const categories = mess.settings?.mealCategories?.length
    ? mess.settings.mealCategories
    : ['Breakfast', 'Lunch', 'Dinner'];
  return categories;
};

const normalizeMealOffMeals = async (messId: string, meals?: string[]) => {
  const allowedCategories = await getMealCategories(messId);
  if (!meals?.length) return allowedCategories;

  const allowedByLower = new Map(allowedCategories.map((category) => [category.toLowerCase(), category]));
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const meal of meals) {
    const key = meal.trim().toLowerCase();
    const canonical = allowedByLower.get(key);
    if (!canonical) {
      throw new AppError(400, `Invalid meal-off category: ${meal}. Allowed categories: ${allowedCategories.join(', ')}`);
    }
    if (!seen.has(canonical.toLowerCase())) {
      normalized.push(canonical);
      seen.add(canonical.toLowerCase());
    }
  }

  return normalized;
};

const mealSetsOverlap = (left?: string[], right?: string[]) => {
  if (!left?.length || !right?.length) return true;
  const rightSet = new Set(right.map((meal) => meal.toLowerCase()));
  return left.some((meal) => rightSet.has(meal.toLowerCase()));
};

const recalculateMealCount = (meals: Record<string, number>) => {
  return Object.values(meals).reduce((sum, count) => sum + Number(count || 0), 0);
};

const assertActiveMemberInMess = async (messId: string, messMemberId: string) => {
  const member = await MessMember.findOne({ _id: messMemberId, messId, status: 'active' }).select('_id participation').lean();
  if (!member) throw new AppError(400, 'Active mess member not found for this mess');
  if (member.participation?.meals === false) {
    throw new AppError(400, 'Meal-off request is only available for meal participants');
  }
};

const assertFutureOrTodayRange = (startDate: Date, endDate: Date) => {
  const today = getTodayDhakaNormalized();
  if (startDate < today) throw new AppError(400, 'Meal-off start date cannot be in the past');
  if (endDate < today) throw new AppError(400, 'Meal-off end date cannot be in the past');
  if (endDate < startDate) throw new AppError(400, 'End date must be after or same as start date');
};

const assertNoOverlappingActiveRequest = async (
  messId: string,
  messMemberId: string,
  startDate: Date,
  endDate: Date,
  requestedMeals: string[]
) => {
  const existingRequests = await MealOffRequest.find({
    messId,
    messMemberId,
    status: { $in: ['pending', 'approved'] },
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  }).select('_id status startDate endDate meals').lean();

  const existing = existingRequests.find((request) => mealSetsOverlap(request.meals, requestedMeals));
  if (existing) {
    throw new AppError(409, 'An active meal-off request already overlaps this date range');
  }
};

const buildListQuery = (messId: string, options: ListMealOffRequestsOptions) => {
  const query: Record<string, unknown> = { messId: new mongoose.Types.ObjectId(messId) };

  if (options.status) query.status = options.status;

  if (options.scope === 'my') {
    if (!options.requesterMemberId) throw new AppError(403, 'Active member context is required');
    query.messMemberId = new mongoose.Types.ObjectId(options.requesterMemberId);
  } else if (options.requesterRole !== 'manager' && !options.isSuperAdmin) {
    if (!options.requesterMemberId) throw new AppError(403, 'Active member context is required');
    if (options.messMemberId && options.messMemberId !== options.requesterMemberId) {
      throw new AppError(403, 'Members can only view their own meal off requests');
    }
    query.messMemberId = new mongoose.Types.ObjectId(options.requesterMemberId);
  } else if (options.messMemberId) {
    query.messMemberId = new mongoose.Types.ObjectId(options.messMemberId);
  }

  const start = options.start ? normalizeMealDate(options.start) : undefined;
  const end = options.end ? normalizeMealDate(options.end) : undefined;

  if (start) query.endDate = { $gte: start };
  if (end) query.startDate = { $lte: end };

  return query;
};

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

  const memberOrConditions: Record<string, unknown>[] = [];

  if (users.length) {
    memberOrConditions.push({ userId: { $in: users.map((user) => user._id) } });
  }

  if (isValidObjectId(trimmedSearchTerm)) {
    memberOrConditions.push({ _id: new mongoose.Types.ObjectId(trimmedSearchTerm) });
  }

  if (!memberOrConditions.length) return false;

  const members = await MessMember.find({
    messId,
    $or: memberOrConditions,
  }).select('_id').lean();

  if (!members.length) return false;

  query.messMemberId = { $in: members.map((member) => member._id) };
  return true;
};

export const createRequest = async (messId: string, payload: { messMemberId: string, startDate: string, endDate: string, meals?: string[], reason?: string }) => {
  await assertActiveMemberInMess(messId, payload.messMemberId);
  const sDate = normalizeMealDate(payload.startDate);
  const eDate = normalizeMealDate(payload.endDate);
  const meals = await normalizeMealOffMeals(messId, payload.meals);

  assertFutureOrTodayRange(sDate, eDate);
  await assertNoOverlappingActiveRequest(messId, payload.messMemberId, sDate, eDate, meals);

  return await MealOffRequest.create({ messId, messMemberId: payload.messMemberId, startDate: sDate, endDate: eDate, meals, reason: payload.reason, status: 'pending' });
};

export const listRequests = async (messId: string, options: ListMealOffRequestsOptions = {}) => {
  const page = options.page || 1;
  const limit = options.limit || 20;

  if (options.messMemberId) await assertActiveMemberInMess(messId, options.messMemberId);

  const query = buildListQuery(messId, options);
  const hasSearchMatches = await applyMemberSearch(messId, query, options.searchTerm);
  if (!hasSearchMatches) {
    return {
      items: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    };
  }

  const [items, total] = await Promise.all([
    MealOffRequest.find(query)
      .populate({
        path: 'messMemberId',
        select: 'userId messRole status',
        populate: { path: 'userId', select: 'fullName email phone avatarUrl' },
      })
      .populate('reviewedBy', 'fullName email phone avatarUrl')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    MealOffRequest.countDocuments(query),
  ]);

  const legacyReviewerIds = items
    .filter((item: any) => !item.reviewedBy && item.approvedBy)
    .map((item: any) => item.approvedBy);
  const legacyReviewers = legacyReviewerIds.length
    ? await User.find({ _id: { $in: legacyReviewerIds } }).select('fullName email phone avatarUrl').lean()
    : [];
  const legacyReviewerById = new Map(legacyReviewers.map((user) => [String(user._id), user]));

  return {
    items: items.map((item) => {
      const request = { ...item };
      const legacyApprovedBy = (request as any).approvedBy;
      delete (request as any).approvedBy;

      if (!request.reviewedBy && legacyApprovedBy) {
        request.reviewedBy = legacyReviewerById.get(String(legacyApprovedBy)) ?? legacyApprovedBy;
        request.reviewedAt = (request as any).updatedAt;
      }

      const populatedMember = item.messMemberId as any;
      if (!populatedMember || !populatedMember.userId) {
        return request;
      }

      const { userId, ...member } = populatedMember;
      return {
        ...request,
        messMemberId: {
          ...member,
          user: userId,
        },
      };
    }),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const approveRequest = async (messId: string, requestId: string, managerUserId: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const req = await MealOffRequest.findOne({ _id: requestId, messId, status: 'pending' }).session(session);
    if (!req) throw new AppError(404, 'Pending request not found');

    req.status = 'approved';
    req.reviewedBy = new mongoose.Types.ObjectId(managerUserId);
    req.reviewedAt = new Date();

    const todayNormalized = getTodayDhakaNormalized();
    if (req.startDate < todayNormalized) {
      throw new AppError(400, 'Cannot approve a meal-off request that starts in the past');
    }

    const mealCategories = req.meals?.length ? req.meals : await getMealCategories(messId);
    const datesToLock = generateDateRange(req.startDate, req.endDate);

    const automatedMealPromises = datesToLock.map(async (d) => {
      const existingMeal = await Meal.findOne({ messId, messMemberId: req.messMemberId, date: d }).session(session);
      const meals = existingMeal?.meals instanceof Map
        ? Object.fromEntries(existingMeal.meals.entries())
        : { ...(existingMeal?.meals as Record<string, number> | undefined) };

      for (const category of mealCategories) {
        meals[category] = 0;
      }

      const mealCount = recalculateMealCount(meals);

      return Meal.findOneAndUpdate(
        { messId, messMemberId: req.messMemberId, date: d },
        { mealCount, meals, createdBy: new mongoose.Types.ObjectId(managerUserId) },
        { new: true, upsert: true, runValidators: true, session }
      );
    });

    await Promise.all(automatedMealPromises);
    await req.save({ session });
    await session.commitTransaction();
    return req;
  } catch(err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

const rejectRequest = async (messId: string, requestId: string, managerUserId: string) => {
  const req = await MealOffRequest.findOneAndUpdate(
    { _id: requestId, messId, status: 'pending' },
    { status: 'rejected', reviewedBy: new mongoose.Types.ObjectId(managerUserId), reviewedAt: new Date() },
    { new: true, runValidators: true }
  );
  if (!req) throw new AppError(404, 'Pending request not found');
  return req;
};

const cancelRequest = async (messId: string, requestId: string, managerUserId: string) => {
  const req = await MealOffRequest.findOneAndUpdate(
    { _id: requestId, messId, status: 'approved' },
    { status: 'canceled', reviewedBy: new mongoose.Types.ObjectId(managerUserId), reviewedAt: new Date() },
    { new: true, runValidators: true }
  );
  if (!req) throw new AppError(404, 'Approved request not found');
  return req;
};

export const cancelOwnPendingRequest = async (
  messId: string,
  requestId: string,
  actorMemberId: string,
  actorUserId: string
) => {
  const req = await MealOffRequest.findOneAndUpdate(
    {
      _id: requestId,
      messId,
      messMemberId: actorMemberId,
      status: 'pending',
    },
    {
      status: 'canceled',
      reviewedBy: new mongoose.Types.ObjectId(actorUserId),
      reviewedAt: new Date(),
    },
    { new: true, runValidators: true }
  );

  if (!req) {
    throw new AppError(404, 'Pending meal-off request not found for this member');
  }

  return req;
};

export const reviewRequest = async (
  messId: string,
  requestId: string,
  managerUserId: string,
  status: MealOffRequestStatus
) => {
  if (status === 'approved') return approveRequest(messId, requestId, managerUserId);
  if (status === 'rejected') return rejectRequest(messId, requestId, managerUserId);
  if (status === 'canceled') return cancelRequest(messId, requestId, managerUserId);
  throw new AppError(400, 'Invalid status. Must be approved, rejected, or canceled');
};
