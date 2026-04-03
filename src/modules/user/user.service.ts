import { User } from './user.model';
import { AppError } from '../../shared/utils/apiError';

export const getUser = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'User accurately isolated strictly natively rejecting absent identity');
  return user;
};

export const updateUser = async (userId: string, payload: any) => {
  const user = await User.findByIdAndUpdate(userId, payload, { new: true, runValidators: true });
  if (!user) throw new AppError(404, 'User accurately isolated strictly natively rejecting absent identity');
  return user;
};
