import { User } from '../user/user.model';
import { Mess } from '../mess/mess.model';
import { MessMember } from '../mess-member/mess-member.model';
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

  const [items, total] = await Promise.all([
    User.find(query).select('-passwordHash').skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }),
    User.countDocuments(query),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getAllMesses = async (page: number, limit: number, searchTerm?: string, status?: 'active' | 'suspended') => {
  const query: Record<string, unknown> = status ? { status } : {};

  if (searchTerm?.trim()) {
    const regex = new RegExp(escapeRegExp(searchTerm.trim()), 'i');
    const matchingManagers = await User.find({
      $or: [
        { fullName: regex },
        { email: regex },
        { phone: regex },
      ],
    }).select('_id').lean();

    const managerMemberships = matchingManagers.length
      ? await MessMember.find({
          userId: { $in: matchingManagers.map((user) => user._id) },
          messRole: 'manager',
          status: 'active',
        }).select('messId').lean()
      : [];

    query.$or = [
      { name: regex },
      { address: regex },
      { inviteCode: regex },
      ...(managerMemberships.length ? [{ _id: { $in: managerMemberships.map((member) => member.messId) } }] : []),
    ];
  }

  const [messes, total] = await Promise.all([
    Mess.find(query).skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }).lean(),
    Mess.countDocuments(query),
  ]);
  const managerMemberships = await MessMember.find({
    messId: { $in: messes.map((mess) => mess._id) },
    messRole: 'manager',
    status: 'active',
  })
    .populate('userId', 'fullName email phone avatarUrl globalRole status')
    .lean();

  const managerByMessId = new Map(managerMemberships.map((member) => [String(member.messId), member.userId]));
  const memberCounts = await MessMember.aggregate([
    {
      $match: {
        messId: { $in: messes.map((mess) => mess._id) },
        status: 'active',
      },
    },
    {
      $group: {
        _id: '$messId',
        count: { $sum: 1 },
      },
    },
  ]);
  const memberCountByMessId = new Map(memberCounts.map((item) => [String(item._id), item.count]));

  return {
    items: messes.map((mess) => ({
      ...mess,
      id: mess._id,
      manager: managerByMessId.get(String(mess._id)) ?? null,
      memberCount: memberCountByMessId.get(String(mess._id)) ?? 0,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const updateUserRole = async (userId: string, targetRole: string) => {
  if (!['user', 'manager', 'super_admin'].includes(targetRole)) throw new AppError(400, 'Invalid platform globalRole specified');
  const user = await User.findByIdAndUpdate(userId, { globalRole: targetRole }, { new: true }).select('-passwordHash');
  if(!user) throw new AppError(404, 'User not found in global mapping');
  return user;
};

export const blockUser = async (userId: string, status: 'active' | 'blocked') => {
  if (!['active', 'blocked'].includes(status)) throw new AppError(400, 'Invalid status. Must be active or blocked');
  const user = await User.findByIdAndUpdate(userId, { status }, { new: true }).select('-passwordHash');
  if(!user) throw new AppError(404, 'User not found');
  return user;
};

export const updateMessStatus = async (messId: string, status: 'active' | 'suspended', adminId: string, suspensionNote?: string) => {
  const update = status === 'suspended'
    ? { status, suspensionNote, suspendedAt: new Date(), suspendedBy: adminId }
    : { status, $unset: { suspensionNote: '', suspendedAt: '', suspendedBy: '' } };

  const mess = await Mess.findByIdAndUpdate(messId, update, { new: true });
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
