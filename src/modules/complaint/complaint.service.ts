import mongoose from 'mongoose';
import { Complaint } from './complaint.model';
import { AppError } from '../../shared/utils/apiError';
import { CreateComplaintPayload } from './complaint.validation';

const complaintPopulate = {
  path: 'messMemberId',
  select: 'userId messRole status participation',
  populate: { path: 'userId', select: 'fullName email phone avatarUrl' },
};

const getComplaintOwnerId = (complaint: any) => {
  const member = complaint.messMemberId;
  return typeof member === 'object' && member?._id ? member._id.toString() : member.toString();
};

export const createComplaint = async (messId: string, payload: CreateComplaintPayload, myMemberId: string) => {
  const complaint = await Complaint.create({ messId, messMemberId: new mongoose.Types.ObjectId(myMemberId), ...payload });
  return Complaint.findById(complaint._id).populate(complaintPopulate);
};

const paginate = async (query: Record<string, unknown>, page: number, limit: number) => {
  const [data, total] = await Promise.all([
    Complaint.find(query).populate(complaintPopulate).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Complaint.countDocuments(query),
  ]);
  return { meta: { page, limit, total, totalPages: Math.ceil(total / limit) }, data };
};

export const getComplaints = async (messId: string, options: any = {}) => {
  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 20;
  const query: Record<string, unknown> = { messId };
  if (options.messMemberId) query.messMemberId = new mongoose.Types.ObjectId(options.messMemberId);
  if (options.status) query.status = options.status;
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
  const comp = await Complaint.findOne({ _id: complaintId, messId }).populate(complaintPopulate);
  if (!comp) throw new AppError(404, 'Complaint not found');
  
  if (!isManager && getComplaintOwnerId(comp) !== myMemberId) {
    throw new AppError(403, 'Permission denied, you cannot view this complaint');
  }
  
  return comp;
};

export const updateComplaintStatus = async (messId: string, complaintId: string, status: string, resolvedNote: string, managerId: string) => {
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
  ).populate(complaintPopulate);
  if (!comp) throw new AppError(404, 'Complaint bounds check failed');
  return comp;
};
