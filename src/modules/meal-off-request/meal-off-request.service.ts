import { MealOffRequest } from './meal-off-request.model';
import { Meal } from '../meal/meal.model';
import { MessMember } from '../mess-member/mess-member.model';
import { User } from '../user/user.model';
import { AppError } from '../../shared/utils/apiError';
import { normalizeMealDate, getDhakaNow, generateDateRange } from '../../shared/utils/dateUtils';
import mongoose, { isValidObjectId } from 'mongoose';

export type MealOffRequestStatus = 'pending' | 'approved' | 'rejected';

export type ListMealOffRequestsOptions = {
  page?: number;
  limit?: number;
  status?: MealOffRequestStatus;
  messMemberId?: string;
  searchTerm?: string;
  start?: string;
  end?: string;
  requesterMemberId?: string;
  requesterRole?: 'manager' | 'member';
  isSuperAdmin?: boolean;
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const assertActiveMemberInMess = async (messId: string, messMemberId: string) => {
  const member = await MessMember.findOne({ _id: messMemberId, messId, status: 'active' }).select('_id').lean();
  if (!member) throw new AppError(400, 'Active mess member not found for this mess');
};

const buildListQuery = (messId: string, options: ListMealOffRequestsOptions) => {
  const query: Record<string, unknown> = { messId: new mongoose.Types.ObjectId(messId) };

  if (options.status) query.status = options.status;

  if (options.requesterRole !== 'manager' && !options.isSuperAdmin) {
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

export const createRequest = async (messId: string, payload: { messMemberId: string, startDate: string, endDate: string, reason?: string }) => {
  const sDate = normalizeMealDate(payload.startDate);
  const eDate = normalizeMealDate(payload.endDate);
  
  if (eDate < sDate) throw new AppError(400, 'End date must be after or same as start date');

  return await MealOffRequest.create({ messId, messMemberId: payload.messMemberId, startDate: sDate, endDate: eDate, reason: payload.reason, status: 'pending' });
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
      .populate('approvedBy', 'fullName email phone avatarUrl')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    MealOffRequest.countDocuments(query),
  ]);

  return {
    items: items.map((item) => {
      const populatedMember = item.messMemberId as any;
      if (!populatedMember || !populatedMember.userId) {
        return {
          ...item,
          id: item._id,
        };
      }

      const { userId, ...member } = populatedMember;
      return {
        ...item,
        id: item._id,
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

export const approveRequest = async (messId: string, requestId: string, managerUserId: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const req = await MealOffRequest.findOne({ _id: requestId, messId, status: 'pending' }).session(session);
    if (!req) throw new AppError(404, 'Pending request not found');

    req.status = 'approved';
    req.approvedBy = new mongoose.Types.ObjectId(managerUserId);

    // Business Rule: Future dates managed automatically. Past dates ignored requiring explicit human review.
    const todayNormalized = normalizeMealDate(getDhakaNow());
    const datesToLock = generateDateRange(req.startDate, req.endDate);

    const automatedMealPromises = datesToLock.map(d => {
       if (d >= todayNormalized) {
         return Meal.findOneAndUpdate(
           { messId, messMemberId: req.messMemberId, date: d },
           { mealCount: 0, createdBy: new mongoose.Types.ObjectId(managerUserId) },
           { new: true, upsert: true, runValidators: true, session }
         );
       }
       return Promise.resolve(null);
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

export const rejectRequest = async (messId: string, requestId: string, managerUserId: string) => {
  const req = await MealOffRequest.findOneAndUpdate(
    { _id: requestId, messId, status: 'pending' },
    { status: 'rejected', approvedBy: new mongoose.Types.ObjectId(managerUserId) },
    { new: true, runValidators: true }
  );
  if (!req) throw new AppError(404, 'Pending request not found');
  return req;
};
