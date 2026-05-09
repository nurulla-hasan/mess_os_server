import { User } from '../user/user.model';
import { Mess } from '../mess/mess.model';
import { MessMember } from '../mess-member/mess-member.model';
import { ManagerRequest } from '../manager-request/manager-request.model';
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

  if (targetRole === 'user') {
    const managedMess = await MessMember.findOne({
      userId,
      messRole: 'manager',
      status: 'active',
    }).populate('messId', 'name');

    if (managedMess) {
      const messName = (managedMess.messId as any)?.name;
      throw new AppError(
        400,
        `Cannot downgrade this user while they manage an active mess${messName ? ` (${messName})` : ''}. Transfer ownership first.`
      );
    }
  }

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

const buildDailyTrend = async (model: any, dateField: string, days = 30) => {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const results = await model.aggregate([
    { $match: { [dateField]: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: `$${dateField}` } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const trends: Array<{ date: string; count: number }> = [];
  for (let i = 0; i < days; i += 1) {
    const date = new Date(since);
    date.setDate(since.getDate() + i);
    const dateKey = date.toISOString().slice(0, 10);
    const match = results.find((item: any) => item._id === dateKey);
    trends.push({ date: dateKey, count: match ? match.count : 0 });
  }

  return trends;
};

export const getPlatformStats = async () => {
  const totalUsers = await User.countDocuments();
  const totalMesses = await Mess.countDocuments();
  const suspendedMesses = await Mess.countDocuments({ status: 'suspended' });
  const activeMesses = await Mess.countDocuments({ status: 'active' });
  
  return { totalUsers, totalMesses, suspendedMesses, activeMesses };
};

export const getPlatformAnalytics = async () => {
  const [
    totalUsers,
    activeUsers,
    blockedUsers,
    totalManagers,
    activeManagers,
    blockedManagers,
    totalMesses,
    activeMesses,
    suspendedMesses,
    totalActiveMembers,
    pendingManagerRequests,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ status: 'active' }),
    User.countDocuments({ status: 'blocked' }),
    User.countDocuments({ globalRole: 'manager' }),
    User.countDocuments({ globalRole: 'manager', status: 'active' }),
    User.countDocuments({ globalRole: 'manager', status: 'blocked' }),
    Mess.countDocuments(),
    Mess.countDocuments({ status: 'active' }),
    Mess.countDocuments({ status: 'suspended' }),
    MessMember.countDocuments({ status: 'active' }),
    ManagerRequest.countDocuments({ status: 'pending' }),
  ]);

  const [dailyNewUsers, dailyNewMesses] = await Promise.all([
    buildDailyTrend(User, 'createdAt', 30),
    buildDailyTrend(Mess, 'createdAt', 30),
  ]);

  return {
    summary: {
      users: { total: totalUsers, active: activeUsers, blocked: blockedUsers },
      managers: { total: totalManagers, active: activeManagers, blocked: blockedManagers },
      messes: { total: totalMesses, active: activeMesses, suspended: suspendedMesses },
      members: { active: totalActiveMembers },
      pendingManagerRequests,
    },
    trends: {
      dailyNewUsers,
      dailyNewMesses,
    },
    labels: {
      userGrowth: 'Daily New Users (Last 30 Days)',
      messGrowth: 'Daily New Messes (Last 30 Days)',
    }
  };
};
