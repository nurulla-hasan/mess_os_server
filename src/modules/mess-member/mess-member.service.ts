import mongoose from 'mongoose';
import { Mess } from '../mess/mess.model';
import { User } from '../user/user.model';
import { MessMember } from './mess-member.model';
import { ResidentToggleRequest } from './resident-toggle-request.model';
import { AppError } from '../../shared/utils/apiError';
import { UpdateMemberParticipationPayload } from './mess-member.validation';
import { Subscription } from '../subscription/subscription.model';
import { SubscriptionPlan } from '../subscription/subscription-plan.model';
import { assignDefaultSubscription } from '../subscription/subscription.service';
import { MemberBill } from '../billing/member-bill.model';
import { MemberLedger } from '../ledger/member-ledger.model';
import { Expense } from '../expense/expense.model';
import { Meal } from '../meal/meal.model';
import { DHAKA_OFFSET_MS, getMonthBoundariesDhaka, normalizeMealDate } from '../../shared/utils/dateUtils';

// Reusable helper to find a member by query or throw an AppError
const findMemberOrThrow = async (query: object, errorMsg: string, statusCode = 404) => {
  const member = await MessMember.findOne(query);
  if (!member) throw new AppError(statusCode, errorMsg);
  return member;
};

// Members can be looked up by _id or by userId — same pattern 3 times extracted here
const memberIdOrUserIdQuery = (messId: string, memberId: string) => ({
  $or: [{ _id: memberId }, { userId: memberId }],
  messId,
});

export const requestJoin = async (userId: string, inviteCode: string) => {
  // Find the mess by invite code
  const mess = await Mess.findOne({ inviteCode });
  if (!mess) throw new AppError(404, 'Invalid invite code. No mess found');

  // Check if the user already has any record in this mess
  const existing = await MessMember.findOne({ messId: mess._id, userId });
  if (existing) {
    if (existing.status === 'rejected') {
      existing.status = 'pending';
      existing.joinedAt = undefined;
      existing.leftAt = undefined;
      await existing.save();
      return existing;
    }

    const statusMessages: Record<string, string> = {
      active: 'You are already a member of this mess',
      pending: 'You already have a pending join request for this mess',
      removed: 'You have been removed from this mess.',
    };
    throw new AppError(400, statusMessages[existing.status] ?? 'Cannot join this mess');
  }

  const member = await MessMember.create({
    messId: mess._id,
    userId,
    messRole: 'member',
    status: 'pending',
  });

  return member;
};

export type MemberStatus = 'pending' | 'active' | 'rejected' | 'removed';
export type PendingMemberTargetStatus = 'active' | 'rejected';

type GetMembersOptions = {
  status?: MemberStatus;
  searchTerm?: string;
  page?: number;
  limit?: number;
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const assertMemberLimitAvailable = async (messId: string) => {
  const subscription = (await Subscription.findOne({ messId }).lean()) || (await assignDefaultSubscription(messId)).toObject();
  const plan = await SubscriptionPlan.findOne({ code: subscription.planId, isActive: true }).select('name maxMembers').lean();
  if (!plan) throw new AppError(402, 'Your current subscription plan is unavailable. Please choose a plan.');

  const activeMembers = await MessMember.countDocuments({ messId, status: 'active' });
  if (activeMembers >= plan.maxMembers) {
    throw new AppError(402, `Your current plan (${plan.name}) allows up to ${plan.maxMembers} active members. Please upgrade to approve more members.`);
  }
};

export const getMembers = async (messId: string, options: GetMembersOptions = {}) => {
  const { status, searchTerm } = options;
  const page = options.page || 1;
  const limit = options.limit || 20;
  const query: Record<string, unknown> = status ? { messId, status } : { messId };

  if (searchTerm?.trim()) {
    const regex = new RegExp(escapeRegExp(searchTerm.trim()), 'i');
    const users = await User.find({
      $or: [
        { fullName: regex },
        { email: regex },
        { phone: regex },
      ],
    }).select('_id').lean();

    if (!users.length) {
      return {
        items: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      };
    }
    query.userId = { $in: users.map((user) => user._id) };
  }

  const [members, total] = await Promise.all([
    MessMember.find(query)
      .populate('userId', 'fullName email phone avatarUrl')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    MessMember.countDocuments(query),
  ]);

  // --- Calculate estimated meal rate for current month ---
  const messObjectId = new mongoose.Types.ObjectId(messId);
  const today = normalizeMealDate(new Date());
  const dhakaToday = new Date(today.getTime() + DHAKA_OFFSET_MS);
  const { start: monthStart, end: monthEnd } = getMonthBoundariesDhaka(dhakaToday.getUTCMonth() + 1, dhakaToday.getUTCFullYear());

  // Fetch mess settings to get mealCategories (only meal-category expenses count toward meal rate)
  const messSettings = await Mess.findById(messObjectId).select('settings').lean();
  const mealCategories: string[] = messSettings?.settings?.mealCategories ?? [];

  const [mealExpenseResult, totalMealsResult] = await Promise.all([
    Expense.aggregate([
      {
        $match: {
          messId: messObjectId,
          status: 'approved',
          date: { $gte: monthStart, $lte: monthEnd },
          ...(mealCategories.length > 0 ? { category: { $in: mealCategories } } : {}),
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Meal.aggregate([
      { $match: { messId: messObjectId, date: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: null, total: { $sum: '$mealCount' } } },
    ]),
  ]);

  const mealExpense = mealExpenseResult[0]?.total ?? 0;
  const totalMealsAll = totalMealsResult[0]?.total ?? 0;
  const estimatedRate = totalMealsAll > 0 ? Math.round((mealExpense / totalMealsAll) * 100) / 100 : 0;

  // --- Fetch ledger balances and current month meal counts per member ---
  const memberIds = members.map((m) => m._id);
  const [ledgerBalances, memberMealCounts] = await Promise.all([
    MemberLedger.aggregate([
      { $match: { messMemberId: { $in: memberIds }, messId: messObjectId, isVoided: { $ne: true } } },
      {
        $group: {
          _id: '$messMemberId',
          totalCredits: { $sum: { $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0] } },
          totalCharges: { $sum: { $cond: [{ $eq: ['$type', 'charge'] }, '$amount', 0] } },
        },
      },
    ]),
    Meal.aggregate([
      { $match: { messMemberId: { $in: memberIds }, messId: messObjectId, date: { $gte: monthStart, $lte: monthEnd } } },
      {
        $group: {
          _id: '$messMemberId',
          totalMeals: { $sum: '$mealCount' },
        },
      },
    ]),
  ]);

  // Build meal count map
  const mealCountMap = new Map<string, number>();
  for (const mc of memberMealCounts) {
    mealCountMap.set(String(mc._id), mc.totalMeals ?? 0);
  }

  // Compute balance including estimated meal charge
  const balanceMap = new Map<string, { due: number; advance: number; type: 'due' | 'advance' | 'settled'; amount: number; estimatedMealCharge: number }>();
  for (const b of ledgerBalances) {
    const memberId = String(b._id);
    const memberMeals = mealCountMap.get(memberId) ?? 0;
    const estimatedMealCharge = memberMeals > 0 && estimatedRate > 0 ? +(memberMeals * estimatedRate).toFixed(2) : 0;

    const effective = (b.totalCredits ?? 0) - (b.totalCharges ?? 0) - estimatedMealCharge;
    const due = Math.max(0, -effective);
    const advance = Math.max(0, effective);
    const type = advance > 0 ? 'advance' : due > 0 ? 'due' : 'settled';
    const amount = type === 'advance' ? advance : due;
    balanceMap.set(memberId, { due, advance, type, amount, estimatedMealCharge });
  }

  // Also set balance for members with no ledger entries but with meals
  for (const m of members) {
    const memberId = String(m._id);
    if (!balanceMap.has(memberId)) {
      const memberMeals = mealCountMap.get(memberId) ?? 0;
      const estimatedMealCharge = memberMeals > 0 && estimatedRate > 0 ? +(memberMeals * estimatedRate).toFixed(2) : 0;

      if (estimatedMealCharge > 0) {
        const effective = -estimatedMealCharge;
        const due = Math.max(0, -effective);
        balanceMap.set(memberId, { due, advance: 0, type: 'due', amount: due, estimatedMealCharge });
      } else {
        balanceMap.set(memberId, { due: 0, advance: 0, type: 'settled', amount: 0, estimatedMealCharge: 0 });
      }
    }
  }

  return {
    items: members.map((m) => {
      const balance = balanceMap.get(String(m._id)) || { due: 0, advance: 0, type: 'settled' as const, amount: 0, estimatedMealCharge: 0 };
      return {
        _id: m._id,
        messId: m.messId,
        messRole: m.messRole,
        status: m.status,
        isResidentManager: (m as Record<string, unknown>).isResidentManager !== false,
        participation: {
          meals: m.participation?.meals ?? true,
          sharedExpenses: m.participation?.sharedExpenses ?? true,
        },
        joinedAt: m.joinedAt,
        leftAt: m.leftAt,
        createdAt: (m as Record<string, unknown>).createdAt as string | undefined,
        user: m.userId, // populated user info
        balance,
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

export const getActiveMemberOptions = async (messId: string) => {
  const members = await MessMember.find({ messId, status: 'active' })
    .populate('userId', 'fullName email phone avatarUrl')
    .sort({ messRole: -1, createdAt: 1 })
    .lean();

  return members.map((member) => {
    const user = member.userId as unknown as { _id: string; fullName: string; email?: string; phone?: string; avatarUrl?: string } | undefined;
    return {
      _id: member._id,
      userId: user?._id,
      name: user?.fullName ?? '',
      email: user?.email,
      phone: user?.phone,
      avatar: user?.avatarUrl ?? '',
      messRole: member.messRole,
      isResidentManager: (member as Record<string, unknown>).isResidentManager !== false,
      participation: {
        meals: member.participation?.meals ?? true,
        sharedExpenses: member.participation?.sharedExpenses ?? true,
      },
    };
  });
};

export const updatePendingMemberStatus = async (
  messId: string,
  memberId: string,
  status: PendingMemberTargetStatus
) => {
  const member = await findMemberOrThrow(
    {
      ...memberIdOrUserIdQuery(messId, memberId),
      status: 'pending',
    },
    'Pending join request not found'
  );

  if (status === 'active') await assertMemberLimitAvailable(messId);

  member.status = status;
  if (status === 'active') member.joinedAt = new Date();
  await member.save();

  return member;
};

/**
 * Manager requests to toggle their resident status.
 * - If going from External → Resident (opting IN to billing): instant, no approval needed.
 * - If going from Resident → External (opting OUT of billing): a request is created,
 *   and at least 3 active members must accept before it takes effect.
 */
export const requestResidentToggle = async (messId: string, managerId: string, requestedBy: string) => {
  const manager = await findMemberOrThrow(
    {
      ...memberIdOrUserIdQuery(messId, managerId),
      messRole: 'manager',
      status: 'active',
    },
    'Active manager not found'
  );

  // Going back to Resident (opting in) — instant, no approval needed
  if (manager.isResidentManager === false) {
    manager.isResidentManager = true;
    await manager.save();

    // Cancel any pending requests for this manager
    await ResidentToggleRequest.updateMany(
      { messId, managerId: manager._id, status: 'pending' },
      { status: 'rejected' }
    );

    return { instant: true, manager };
  }

  // Going External (opting out) — require member approvals
  // Check for already pending request
  const existingPending = await ResidentToggleRequest.findOne({
    messId,
    managerId: manager._id,
    status: 'pending',
  });

  if (existingPending) {
    throw new AppError(400, 'A pending request already exists for this manager. Please wait for members to approve it.');
  }

  // Check minimum active members (at least 3 needed to approve)
  const activeMemberCount = await MessMember.countDocuments({
    messId,
    status: 'active',
    messRole: 'member',
  });

  if (activeMemberCount < 3) {
    throw new AppError(
      400,
      'Cannot request to go External. At least 3 active members are required in the mess to approve this request.'
    );
  }

  const request = await ResidentToggleRequest.create({
    messId,
    managerId: manager._id,
    requestedBy,
    status: 'pending',
    acceptedBy: [],
  });

  return { request, manager };
};

/**
 * A member accepts a resident toggle request.
 * When 3 members have accepted, the request is auto-approved and the manager's status is toggled.
 */
export const acceptResidentToggleRequest = async (messId: string, requestId: string, memberId: string) => {
  // Verify the accepting member
  const member = await findMemberOrThrow(
    {
      ...memberIdOrUserIdQuery(messId, memberId),
      status: 'active',
      messRole: 'member',
    },
    'Active member not found. Only regular members can accept toggle requests.'
  );

  // Find the pending request
  const request = await ResidentToggleRequest.findOne({
    _id: requestId,
    messId,
    status: 'pending',
  });

  if (!request) {
    throw new AppError(404, 'Pending toggle request not found');
  }

  // Check if already accepted
  if (request.acceptedBy.some((id) => id.toString() === member._id.toString())) {
    throw new AppError(400, 'You have already accepted this request');
  }

  // Add acceptance
  request.acceptedBy.push(member._id);
  const acceptCount = request.acceptedBy.length;

  // Auto-approve when 3 members accept
  if (acceptCount >= 3) {
    request.status = 'approved';

    // Toggle the manager's resident status
    const manager = await MessMember.findById(request.managerId);
    if (manager) {
      manager.isResidentManager = false;
      await manager.save();
    }
  }

  await request.save();
  return { request, acceptCount, approved: acceptCount >= 3 };
};

export const getPendingToggleRequests = async (messId: string) => {
  const requests = await ResidentToggleRequest.find({ messId, status: 'pending' })
    .populate({
      path: 'managerId',
      populate: { path: 'userId', select: 'fullName email phone avatarUrl' },
    })
    .populate({
      path: 'acceptedBy',
      populate: { path: 'userId', select: 'fullName' },
    })
    .sort({ createdAt: -1 })
    .lean();

  return requests;
};

export const updateMemberParticipation = async (
  messId: string,
  memberId: string,
  payload: UpdateMemberParticipationPayload
) => {
  const member = await findMemberOrThrow(
    {
      ...memberIdOrUserIdQuery(messId, memberId),
      status: 'active',
    },
    'Active member not found'
  );

  // Managers cannot modify participation — they must use Resident toggle flow
  if (member.messRole === 'manager') {
    throw new AppError(403, 'Managers cannot modify participation directly. Use Resident toggle instead.');
  }

  member.participation = {
    meals: payload.participation.meals ?? member.participation?.meals ?? true,
    sharedExpenses: payload.participation.sharedExpenses ?? member.participation?.sharedExpenses ?? true,
  };

  await member.save();
  return member;
};

export const removeMember = async (messId: string, memberId: string) => {
  const member = await findMemberOrThrow(
    {
      ...memberIdOrUserIdQuery(messId, memberId),
      status: 'active',
    },
    'Active member not found'
  );

  // Prevent removing the manager
  if (member.messRole === 'manager') {
    throw new AppError(400, 'Cannot remove the mess manager. Transfer ownership first');
  }

  // Check for outstanding dues (member owes mess)
  const outstandingDue = await MemberBill.findOne({
    messMemberId: member._id,
    'summary.finalDue': { $gt: 0 },
  }).select('summary.finalDue').lean();

  if (outstandingDue) {
    throw new AppError(
      400,
      `Cannot remove member with outstanding balance of BDT ${outstandingDue.summary.finalDue}. Please settle all bills first.`
    );
  }

  // Check for advance balance (mess owes member)
  const outstandingAdvance = await MemberBill.findOne({
    messMemberId: member._id,
    'summary.finalAdvance': { $gt: 0 },
  }).select('summary.finalAdvance').lean();

  if (outstandingAdvance) {
    throw new AppError(
      400,
      `Cannot remove member with an advance balance of BDT ${outstandingAdvance.summary.finalAdvance}. Please settle the advance before removal.`
    );
  }

  member.status = 'removed';
  member.leftAt = new Date();
  await member.save();

  return member;
};
