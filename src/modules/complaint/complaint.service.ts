import mongoose from 'mongoose';
import { Complaint } from './complaint.model';
import { AppError } from '../../shared/utils/apiError';
import { CreateComplaintPayload } from './complaint.validation';
import { User } from '../user/user.model';
import { MessMember } from '../mess-member/mess-member.model';

const complaintPopulate = {
  path: 'messMemberId',
  select: 'userId messRole status participation',
  populate: { path: 'userId', select: 'fullName email phone avatarUrl' },
};

const getComplaintOwnerId = (complaint: any) => {
  const member = complaint.messMemberId;
  return typeof member === 'object' && member?._id ? member._id.toString() : member.toString();
};

const normalizeComplaint = (complaint: any) => {
  const raw = typeof complaint.toObject === 'function' ? complaint.toObject() : complaint;
  const populatedMember = raw.messMemberId;
  if (!populatedMember?.userId) return raw;

  const { userId, ...member } = populatedMember;
  return {
    ...raw,
    messMemberId: {
      ...member,
      user: userId,
    },
  };
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const createComplaint = async (messId: string, payload: CreateComplaintPayload, myMemberId: string) => {
  const complaint = await Complaint.create({ messId, messMemberId: new mongoose.Types.ObjectId(myMemberId), ...payload });
  const populated = await Complaint.findById(complaint._id).populate(complaintPopulate);
  return normalizeComplaint(populated);
};

const paginate = async (query: Record<string, unknown>, page: number, limit: number) => {
  const [data, total] = await Promise.all([
    Complaint.find(query)
      .populate(complaintPopulate)
      .populate('resolvedBy', 'fullName email phone avatarUrl')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Complaint.countDocuments(query),
  ]);
  return { meta: { page, limit, total, totalPages: Math.ceil(total / limit) }, data: data.map(normalizeComplaint) };
};

export const getComplaints = async (messId: string, options: any = {}) => {
  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 20;
  const query: Record<string, unknown> = { messId };
  const requestedMemberId = options.messMemberId || options.memberId;
  if (requestedMemberId) query.messMemberId = new mongoose.Types.ObjectId(requestedMemberId);
  if (options.status) query.status = options.status;

  if (options.searchTerm?.trim()) {
    const trimmedSearchTerm = options.searchTerm.trim();
    const regex = new RegExp(escapeRegExp(trimmedSearchTerm), 'i');
    const memberOrConditions: Record<string, unknown>[] = [];
    const users = await User.find({
      $or: [
        { fullName: regex },
        { email: regex },
        { phone: regex },
      ],
    }).select('_id').lean();

    if (users.length) {
      memberOrConditions.push({ userId: { $in: users.map((user) => user._id) } });
    }

    const memberIds = memberOrConditions.length
      ? await MessMember.find({ messId, $or: memberOrConditions }).select('_id').lean()
      : [];

    query.$or = [
      { title: regex },
      { description: regex },
      ...(memberIds.length ? [{ messMemberId: { $in: memberIds.map((member: any) => member._id) } }] : []),
    ];
  }

  return paginate(query, page, limit);
};

export const getMyComplaints = async (messId: string, messMemberId: string, options: any = {}) => {
  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 20;
  const query: Record<string, unknown> = { messId, messMemberId };
  if (options.status) query.status = options.status;
  return paginate(query, page, limit);
};

export const getComplaintById = async (messId: string, complaintId: string, myMemberId: string, isManager: boolean) => {
  const comp = await Complaint.findOne({ _id: complaintId, messId })
    .populate(complaintPopulate)
    .populate('resolvedBy', 'fullName email phone avatarUrl');
  if (!comp) throw new AppError(404, 'Complaint not found');
  
  if (!isManager && getComplaintOwnerId(comp) !== myMemberId) {
    throw new AppError(403, 'Permission denied, you cannot view this complaint');
  }
  
  return normalizeComplaint(comp);
};

export const updateComplaintStatus = async (messId: string, complaintId: string, status: string, resolvedNote: string, managerId: string) => {
  const complaint = await Complaint.findOne({ _id: complaintId, messId });
  if (!complaint) throw new AppError(404, 'Complaint not found');
  if (complaint.status === 'resolved' || complaint.status === 'rejected') {
    throw new AppError(400, 'Resolved or rejected complaints cannot be updated');
  }
  if (status === 'in_progress' && complaint.status !== 'open') {
    throw new AppError(400, 'Only open complaints can be moved to in progress');
  }

  const update: Record<string, unknown> = { status };
  if (status === 'resolved' || status === 'rejected') {
    update.resolvedNote = resolvedNote;
    update.resolvedAt = new Date();
    update.resolvedBy = new mongoose.Types.ObjectId(managerId);
  }

  const comp = await Complaint.findOneAndUpdate(
    { _id: complaintId, messId },
    update,
    { new: true, runValidators: true }
  ).populate(complaintPopulate).populate('resolvedBy', 'fullName email phone avatarUrl');
  if (!comp) throw new AppError(404, 'Complaint bounds check failed');
  return normalizeComplaint(comp);
};
