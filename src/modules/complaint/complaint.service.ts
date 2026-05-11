import mongoose from 'mongoose';
import { Complaint } from './complaint.model';
import { AppError } from '../../shared/utils/apiError';
import { CreateComplaintPayload } from './complaint.validation';

export const createComplaint = async (messId: string, payload: CreateComplaintPayload, myMemberId: string) => {
  return await Complaint.create({ messId, messMemberId: new mongoose.Types.ObjectId(myMemberId), ...payload });
};

const paginate = async (query: Record<string, unknown>, page: number, limit: number) => {
  const [data, total] = await Promise.all([
    Complaint.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Complaint.countDocuments(query),
  ]);
  return { meta: { page, limit, total, totalPages: Math.ceil(total / limit) }, data };
};

export const getComplaints = async (messId: string, options: any = {}) => {
  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 20;
  const query: Record<string, unknown> = { messId };
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
  const comp = await Complaint.findOne({ _id: complaintId, messId });
  if (!comp) throw new AppError(404, 'Complaint not found');
  
  if (!isManager && comp.messMemberId.toString() !== myMemberId) {
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
  );
  if (!comp) throw new AppError(404, 'Complaint bounds check failed');
  return comp;
};
