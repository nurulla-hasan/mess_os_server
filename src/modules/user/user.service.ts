import { User } from './user.model';
import { AppError } from '../../shared/utils/apiError';

import { MessMember } from '../mess-member/mess-member.model';
import { UpdateMePayload, SwitchMessPayload } from './user.validation';
import { Mess } from '../mess/mess.model';

export const getUser = async (userId: string) => {
  const user = await User.findById(userId).lean();
  if (!user) throw new AppError(404, 'User not found');
  
  const memberships = await MessMember.find({ userId })
    .populate('messId', 'name address status suspensionNote suspendedAt suspendedBy')
    .lean();
  
  return { ...user, memberships };
};

export const updateUser = async (userId: string, payload: UpdateMePayload & { avatarUrl?: string, avatarPublicId?: string } | { avatarUrl?: string, avatarPublicId?: string }) => {
  const user = await User.findByIdAndUpdate(userId, payload, { new: true, runValidators: true });
  if (!user) throw new AppError(404, 'User not found');
  return user;
};

export const switchMess = async (userId: string, payload: SwitchMessPayload) => {
  const membership = await MessMember.findOne({
    userId,
    messId: payload.messId,
    status: 'active',
  }).lean();

  if (!membership) {
    throw new AppError(403, 'You are not an active member of this mess');
  }

  const mess = await Mess.findOne({ _id: payload.messId, status: 'active' }).select('_id name status').lean();
  if (!mess) {
    throw new AppError(403, 'This mess is not active');
  }

  return {
    messId: String(mess._id),
    messRole: membership.messRole,
    redirectTo: membership.messRole === 'manager' ? '/manager' : '/dashboard',
    mess,
    membership: {
      _id: membership._id,
      status: membership.status,
      messRole: membership.messRole,
    },
  };
};
