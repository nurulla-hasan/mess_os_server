import { User } from '../user/user.model';
import { Mess } from '../mess/mess.model';
import { AppError } from '../../shared/utils/apiError';

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const getAllUsers = async (page: number, limit: number, searchTerm?: string) => {
  const query: Record<string, unknown> = {};

  if (searchTerm?.trim()) {
    const regex = new RegExp(escapeRegExp(searchTerm.trim()), 'i');
    query.$or = [
      { fullName: regex },
      { email: regex },
      { phone: regex },
      { globalRole: regex },
      { status: regex },
    ];
  }

  return await User.find(query).select('-passwordHash').skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 });
};

export const getAllMesses = async (page: number, limit: number, searchTerm?: string, status?: 'active' | 'suspended') => {
  const query: Record<string, unknown> = status ? { status } : {};

  if (searchTerm?.trim()) {
    const regex = new RegExp(escapeRegExp(searchTerm.trim()), 'i');
    query.$or = [
      { name: regex },
      { address: regex },
      { inviteCode: regex },
    ];
  }

  return await Mess.find(query).skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 });
};

export const updateUserRole = async (userId: string, targetRole: string) => {
  if (!['user', 'manager', 'super_admin'].includes(targetRole)) throw new AppError(400, 'Invalid platform globalRole specified');
  const user = await User.findByIdAndUpdate(userId, { globalRole: targetRole }, { new: true }).select('-passwordHash');
  if(!user) throw new AppError(404, 'User not found in global mapping');
  return user;
};

export const blockUser = async (userId: string) => {
  const user = await User.findByIdAndUpdate(userId, { status: 'blocked' }, { new: true }).select('-passwordHash');
  if(!user) throw new AppError(404, 'User not found');
  return user;
};

export const suspendMess = async (messId: string) => {
  const mess = await Mess.findByIdAndUpdate(messId, { status: 'suspended' }, { new: true });
  if(!mess) throw new AppError(404, 'Mess not found');
  return mess;
};

export const getPlatformStats = async () => {
  const totalUsers = await User.countDocuments();
  const totalMesses = await Mess.countDocuments();
  const suspendedMesses = await Mess.countDocuments({ status: 'suspended' });
  const activeMesses = await Mess.countDocuments({ status: 'active' });
  
  return { totalUsers, totalMesses, suspendedMesses, activeMesses };
};
