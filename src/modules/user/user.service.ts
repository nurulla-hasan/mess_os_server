import { User } from './user.model';
import { AppError } from '../../shared/utils/apiError';

import { MessMember } from '../mess-member/mess-member.model';
import { UpdateMePayload } from './user.validation';

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
