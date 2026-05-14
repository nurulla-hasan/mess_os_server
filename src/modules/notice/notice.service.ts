import mongoose from 'mongoose';
import { Notice } from './notice.model';
import { emailService } from '../../shared/services/emailService';
import { AppError } from '../../shared/utils/apiError';
import { CreateNoticePayload, UpdateNoticePayload } from './notice.validation';

type ListNoticeOptions = {
  page?: number;
  limit?: number;
  status?: 'active' | 'archived';
  searchTerm?: string;
};

const noticePopulate = { path: 'createdBy', select: 'fullName email phone avatarUrl' };
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const createNotice = async (messId: string, payload: CreateNoticePayload, userId: string) => {
  const notice = await Notice.create({ messId, ...payload, createdBy: new mongoose.Types.ObjectId(userId) });
  emailService.sendNotice(messId, notice.title).catch(console.error);
  return Notice.findById(notice._id).populate(noticePopulate);
};

export const getNotices = async (messId: string, options: ListNoticeOptions = {}, isManager = false) => {
  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 20;
  const query: Record<string, unknown> = { messId };

  if (isManager) {
    if (options.status) query.status = options.status;
  } else {
    query.status = 'active';
  }

  if (options.searchTerm?.trim()) {
    const regex = new RegExp(escapeRegExp(options.searchTerm.trim()), 'i');
    query.$or = [{ title: regex }, { content: regex }];
  }

  const [data, total] = await Promise.all([
    Notice.find(query)
      .populate(noticePopulate)
      .sort({ isPinned: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Notice.countDocuments(query),
  ]);

  return { meta: { page, limit, total, totalPages: Math.ceil(total / limit) }, data };
};

export const getNotice = async (messId: string, noticeId: string, isManager = false) => {
  const query: Record<string, unknown> = { _id: noticeId, messId };
  if (!isManager) query.status = 'active';
  const note = await Notice.findOne(query).populate(noticePopulate);
  if (!note) throw new AppError(404, 'Notice not found');
  return note;
};

export const updateNotice = async (messId: string, noticeId: string, payload: UpdateNoticePayload) => {
  const note = await Notice.findOneAndUpdate(
    { _id: noticeId, messId },
    { ...payload, ...(payload.status === 'archived' ? { isPinned: false } : {}) },
    { new: true, runValidators: true }
  ).populate(noticePopulate);
  if (!note) throw new AppError(404, 'Notice not found');
  return note;
};

export const pinNotice = async (messId: string, noticeId: string) => {
  return setNoticePinState(messId, noticeId, true);
};

export const setNoticePinState = async (messId: string, noticeId: string, isPinned: boolean) => {
  const note = await Notice.findOneAndUpdate(
    { _id: noticeId, messId, status: 'active' },
    { isPinned },
    { new: true, runValidators: true }
  ).populate(noticePopulate);
  if (!note) throw new AppError(404, 'Active notice not found');
  return note;
};

export const archiveNotice = async (messId: string, noticeId: string) => {
  const note = await Notice.findOneAndUpdate(
    { _id: noticeId, messId },
    { status: 'archived', isPinned: false },
    { new: true, runValidators: true }
  ).populate(noticePopulate);
  if (!note) throw new AppError(404, 'Notice not found');
  return note;
};
