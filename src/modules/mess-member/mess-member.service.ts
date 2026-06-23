import { Mess } from '../mess/mess.model';
import { User } from '../user/user.model';
import { MessMember } from './mess-member.model';
import { AppError } from '../../shared/utils/apiError';
import { UpdateMemberParticipationPayload } from './mess-member.validation';
import { Subscription } from '../subscription/subscription.model';
import { SubscriptionPlan } from '../subscription/subscription-plan.model';
import { assignDefaultSubscription } from '../subscription/subscription.service';
import { MemberBill } from '../billing/member-bill.model';

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

  return {
    items: members.map((m) => ({
      _id: m._id,
      messId: m.messId,
      messRole: m.messRole,
      status: m.status,
      participation: {
        meals: m.participation?.meals ?? true,
        sharedExpenses: m.participation?.sharedExpenses ?? true,
      },
      joinedAt: m.joinedAt,
      leftAt: m.leftAt,
      createdAt: (m as Record<string, unknown>).createdAt as string | undefined,
      user: m.userId, // populated user info
    })),
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
