import { User } from '../user/user.model';
import { ManagerRequest } from './manager-request.model';
import { AppError } from '../../shared/utils/apiError';

type RequestStatus = 'pending' | 'approved' | 'rejected';
type ReviewStatus = 'approved' | 'rejected';

export const createManagerRequest = async (userId: string, reason?: string) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'User not found');
  if (user.globalRole === 'manager' || user.globalRole === 'super_admin') {
    throw new AppError(400, 'You already have manager access');
  }

  const existing = await ManagerRequest.findOne({ userId }).sort({ createdAt: -1 });
  if (existing?.status === 'pending') {
    throw new AppError(400, 'You already have a pending manager access request');
  }

  if (existing?.status === 'rejected') {
    existing.status = 'pending';
    existing.reason = reason;
    existing.adminNote = undefined;
    existing.reviewedBy = undefined;
    existing.reviewedAt = undefined;
    await existing.save();
    return existing;
  }

  return ManagerRequest.create({ userId, reason, status: 'pending' });
};

export const getMyManagerRequest = async (userId: string) => {
  return ManagerRequest.findOne({ userId }).sort({ createdAt: -1 }).lean();
};

export const listManagerRequests = async (status: RequestStatus | undefined, page: number, limit: number) => {
  const query = status ? { status } : {};
  const [items, total] = await Promise.all([
    ManagerRequest.find(query)
      .populate('userId', 'fullName email phone globalRole status')
      .populate('reviewedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ManagerRequest.countDocuments(query),
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

export const reviewManagerRequest = async (requestId: string, adminId: string, status: ReviewStatus, adminNote?: string) => {
  const request = await ManagerRequest.findById(requestId);
  if (!request) throw new AppError(404, 'Manager access request not found');
  if (request.status !== 'pending') throw new AppError(400, 'Only pending manager access requests can be reviewed');

  request.status = status;
  request.adminNote = adminNote;
  request.reviewedBy = adminId as any;
  request.reviewedAt = new Date();

  if (status === 'approved') {
    const user = await User.findByIdAndUpdate(request.userId, { globalRole: 'manager' }, { new: true });
    if (!user) throw new AppError(404, 'Request user not found');
  }

  await request.save();
  return request.populate('userId', 'fullName email phone globalRole status');
};
