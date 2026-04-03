import mongoose from 'mongoose';
import { Complaint } from './complaint.model';
import { AppError } from '../../shared/utils/apiError';

export const createComplaint = async (messId: string, payload: any, myMemberId: string) => {
  return await Complaint.create({ messId, messMemberId: new mongoose.Types.ObjectId(myMemberId), ...payload });
};

export const getComplaints = async (messId: string) => {
  return await Complaint.find({ messId }).sort({ createdAt: -1 });
};

export const getMyComplaints = async (messId: string, messMemberId: string) => {
  return await Complaint.find({ messId, messMemberId }).sort({ createdAt: -1 });
};

export const getComplaintById = async (messId: string, complaintId: string, myMemberId: string, isManager: boolean) => {
  const comp = await Complaint.findOne({ _id: complaintId, messId });
  if (!comp) throw new AppError(404, 'Complaint not found');
  
  if (!isManager && comp.messMemberId.toString() !== myMemberId) {
    throw new AppError(403, 'Permission denied, you cannot view this complaint');
  }
  
  return comp;
};

export const updateComplaintStatus = async (messId: string, complaintId: string, status: string) => {
  const comp = await Complaint.findOneAndUpdate(
    { _id: complaintId, messId },
    { status },
    { new: true, runValidators: true }
  );
  if (!comp) throw new AppError(404, 'Complaint bounds check failed');
  return comp;
};

export const resolveComplaint = async (messId: string, complaintId: string, resolvedNote: string, managerId: string) => {
  return await Complaint.findOneAndUpdate(
    { _id: complaintId, messId },
    { status: 'resolved', resolvedNote, resolvedAt: new Date(), resolvedBy: new mongoose.Types.ObjectId(managerId) },
    { new: true }
  );
};

export const rejectComplaint = async (messId: string, complaintId: string, resolvedNote: string, managerId: string) => {
  return await Complaint.findOneAndUpdate(
    { _id: complaintId, messId },
    { status: 'rejected', resolvedNote, resolvedAt: new Date(), resolvedBy: new mongoose.Types.ObjectId(managerId) },
    { new: true }
  );
};
