import mongoose from 'mongoose';
import { Notice } from './notice.model';
import { emailService } from '../../shared/services/emailService';
import { AppError } from '../../shared/utils/apiError';

export const createNotice = async (messId: string, payload: any, userId: string) => {
  const notice = await Notice.create({ messId, ...payload, createdBy: new mongoose.Types.ObjectId(userId) });
  emailService.sendNotice(messId, notice.title).catch(console.error);
  return notice;
};

export const getNotices = async (messId: string) => {
  return await Notice.find({ messId }).sort({ isPinned: -1, createdAt: -1 });
};

export const getNotice = async (messId: string, noticeId: string) => {
  const note = await Notice.findOne({ _id: noticeId, messId });
  if (!note) throw new AppError(404, 'Notice not found');
  return note;
};

export const updateNotice = async (messId: string, noticeId: string, payload: any) => {
  const note = await Notice.findOneAndUpdate(
    { _id: noticeId, messId },
    payload,
    { new: true, runValidators: true }
  );
  if (!note) throw new AppError(404, 'Notice not found');
  return note;
};

export const pinNotice = async (messId: string, noticeId: string) => {
  const note = await Notice.findOneAndUpdate(
    { _id: noticeId, messId },
    { isPinned: true },
    { new: true, runValidators: true }
  );
  if (!note) throw new AppError(404, 'Notice not found');
  return note;
};

export const archiveNotice = async (messId: string, noticeId: string) => {
  const note = await Notice.findOneAndUpdate(
    { _id: noticeId, messId },
    { status: 'archived' },
    { new: true, runValidators: true }
  );
  if (!note) throw new AppError(404, 'Notice not found');
  return note;
};
