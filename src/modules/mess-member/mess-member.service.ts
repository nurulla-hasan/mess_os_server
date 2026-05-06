import { Mess } from '../mess/mess.model';
import { MessMember } from './mess-member.model';
import { AppError } from '../../shared/utils/apiError';

// Reusable helper to find a member by query or throw an AppError
const findMemberOrThrow = async (query: object, errorMsg: string, statusCode = 404) => {
  const member = await MessMember.findOne(query);
  if (!member) throw new AppError(statusCode, errorMsg);
  return member;
};

export const requestJoin = async (userId: string, inviteCode: string) => {
  // Find the mess by invite code
  const mess = await Mess.findOne({ inviteCode });
  if (!mess) throw new AppError(404, 'Invalid invite code. No mess found');

  // Check if the user already has any record in this mess
  const existing = await MessMember.findOne({ messId: mess._id, userId });
  if (existing) {
    const statusMessages: Record<string, string> = {
      active: 'You are already a member of this mess',
      pending: 'You already have a pending join request for this mess',
      rejected: 'Your join request was previously rejected. Contact the manager',
      removed: 'You have been removed from this mess. Contact the manager',
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

export const getMembers = async (messId: string) => {
  // Only return active members — pending/rejected are internal state
  const members = await MessMember.find({ messId, status: 'active' })
    .populate('userId', 'fullName email phone avatarUrl')
    .lean();

  return members.map((m) => ({
    id: m._id,
    messId: m.messId,
    messRole: m.messRole,
    status: m.status,
    joinedAt: m.joinedAt,
    user: m.userId, // populated user info
  }));
};

export const getPendingRequests = async (messId: string) => {
  // Separate endpoint for managers to see pending join requests
  const members = await MessMember.find({ messId, status: 'pending' })
    .populate('userId', 'fullName email phone avatarUrl')
    .lean();

  return members.map((m) => ({
    id: m._id,
    messId: m.messId,
    messRole: m.messRole,
    status: m.status,
    createdAt: (m as any).createdAt,
    user: m.userId,
  }));
};

export const approveMember = async (messId: string, memberId: string) => {
  const member = await findMemberOrThrow(
    { 
      $or: [{ _id: memberId }, { userId: memberId }], 
      messId, 
      status: 'pending' 
    },
    'Pending join request not found'
  );

  member.status = 'active';
  member.joinedAt = new Date();
  await member.save();

  return member;
};

export const rejectMember = async (messId: string, memberId: string) => {
  const member = await findMemberOrThrow(
    { 
      $or: [{ _id: memberId }, { userId: memberId }], 
      messId, 
      status: 'pending' 
    },
    'Pending join request not found'
  );

  member.status = 'rejected';
  await member.save();

  return member;
};

export const removeMember = async (messId: string, memberId: string) => {
  const member = await findMemberOrThrow(
    { 
      $or: [{ _id: memberId }, { userId: memberId }], 
      messId, 
      status: 'active' 
    },
    'Active member not found'
  );

  // Prevent removing the manager
  if (member.messRole === 'manager') {
    throw new AppError(400, 'Cannot remove the mess manager. Transfer ownership first');
  }

  member.status = 'removed';
  member.leftAt = new Date();
  await member.save();

  return member;
};

