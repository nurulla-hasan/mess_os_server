import { Mess } from '../mess/mess.model';
import { MessMember } from './mess-member.model';
import { AppError } from '../../shared/utils/apiError';

export const requestJoin = async (userId: string, inviteCode: string) => {
  // Find the mess by invite code
  const mess = await Mess.findOne({ inviteCode });
  if (!mess) throw new AppError(404, 'Invalid invite code. No mess found');

  // Check if the user is already a member or has a pending request
  const existing = await MessMember.findOne({ messId: mess._id, userId });
  if (existing) {
    if (existing.status === 'active') throw new AppError(400, 'You are already a member of this mess');
    if (existing.status === 'pending') throw new AppError(400, 'You already have a pending join request for this mess');
    if (existing.status === 'rejected') throw new AppError(400, 'Your join request was previously rejected. Contact the manager');
    if (existing.status === 'removed') throw new AppError(400, 'You have been removed from this mess. Contact the manager');
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
  const members = await MessMember.find({ messId })
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

export const approveMember = async (messId: string, memberId: string) => {
  const member = await MessMember.findOne({ _id: memberId, messId, status: 'pending' });
  if (!member) throw new AppError(404, 'Pending member not found');

  member.status = 'active';
  member.joinedAt = new Date();
  await member.save();

  return member;
};

export const rejectMember = async (messId: string, memberId: string) => {
  const member = await MessMember.findOne({ _id: memberId, messId, status: 'pending' });
  if (!member) throw new AppError(404, 'Pending member not found');

  member.status = 'rejected';
  await member.save();

  return member;
};

export const removeMember = async (messId: string, memberId: string) => {
  const member = await MessMember.findOne({ _id: memberId, messId, status: 'active' });
  if (!member) throw new AppError(404, 'Active member not found');

  // Prevent removing the manager
  if (member.messRole === 'manager') throw new AppError(400, 'Cannot remove the mess manager. Transfer ownership first');

  member.status = 'removed';
  member.leftAt = new Date();
  await member.save();

  return member;
};
