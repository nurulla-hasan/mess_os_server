import mongoose from 'mongoose';
import { MarketSchedule } from './market-schedule.model';
import { Expense } from '../expense/expense.model';
import { AppError } from '../../shared/utils/apiError';
import { getTodayDhakaNormalized, isBeforeTodayDhaka, normalizeMealDate } from '../../shared/utils/dateUtils';
import { MessMember } from '../mess-member/mess-member.model';
import { assertBillingCycleOpenForDate } from '../billing/billing-lock.service';

const populateScheduleMembers = {
  path: 'assignedTo',
  select: 'userId messRole status',
  populate: { path: 'userId', select: 'fullName email phone avatarUrl' },
};

const normalizeAssignedMembers = (schedule: any): any => {
  const normalizeMember = (member: any) => {
    if (!member?.userId) return member;
    const { userId, ...rest } = member;
    return { ...rest, user: userId };
  };

  if (Array.isArray(schedule)) {
    return schedule.map((item) => normalizeAssignedMembers(item));
  }

  if (!schedule?.assignedTo) return schedule;
  return {
    ...schedule,
    assignedTo: schedule.assignedTo.map(normalizeMember),
  };
};

const assertActiveAssignedMembers = async (messId: string, assignedTo: string[]) => {
  const uniqueMemberIds = Array.from(new Set(assignedTo.map(String)));
  if (uniqueMemberIds.length !== assignedTo.length) throw new AppError(400, 'Duplicate assigned member found');

  const activeCount = await MessMember.countDocuments({
    _id: { $in: uniqueMemberIds.map((id) => new mongoose.Types.ObjectId(id)) },
    messId,
    status: 'active',
  });

  if (activeCount !== uniqueMemberIds.length) {
    throw new AppError(400, 'Market schedule can only be assigned to active members of this mess');
  }
};

export const createSchedule = async (messId: string, payload: any, userId: string) => {
  await assertActiveAssignedMembers(messId, payload.assignedTo);
  const targetDate = normalizeMealDate(payload.targetDate);
  if (isBeforeTodayDhaka(targetDate)) throw new AppError(400, 'Market schedule date cannot be in the past');

  const schedule = await MarketSchedule.create({
    messId,
    ...payload,
    targetDate,
    status: 'pending',
    createdBy: new mongoose.Types.ObjectId(userId)
  });
  const populated = await MarketSchedule.findById(schedule._id).populate(populateScheduleMembers).lean();
  return normalizeAssignedMembers(populated);
};

const listSchedules = async (query: Record<string, unknown>, options: any = {}) => {
  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 20;
  const [data, total] = await Promise.all([
    MarketSchedule.find(query)
      .populate(populateScheduleMembers)
      .sort({ targetDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    MarketSchedule.countDocuments(query),
  ]);
  return { meta: { page, limit, total, totalPages: Math.ceil(total / limit) }, data: normalizeAssignedMembers(data) };
};

export const getSchedules = async (messId: string, options: any = {}) => {
  const query: Record<string, unknown> = { messId };
  if (options.status) query.status = options.status;
  return listSchedules(query, options);
};

export const getMyDuties = async (messId: string, myMemberId: string, options: any = {}) => {
  const query: Record<string, unknown> = { messId, assignedTo: new mongoose.Types.ObjectId(myMemberId) };
  if (options.status) query.status = options.status;
  return listSchedules(query, options);
};

export const updateSchedule = async (messId: string, scheduleId: string, payload: any) => {
  if (payload.assignedTo) await assertActiveAssignedMembers(messId, payload.assignedTo);
  const schedule = await MarketSchedule.findOneAndUpdate(
    { _id: scheduleId, messId, status: 'pending' },
    payload,
    { new: true, runValidators: true }
  ).populate(populateScheduleMembers).lean();
  if (!schedule) throw new AppError(404, 'Schedule not found or not mutable');
  return normalizeAssignedMembers(schedule);
};

const voidSchedule = async (messId: string, scheduleId: string) => {
  const schedule = await MarketSchedule.findOneAndUpdate(
    { _id: scheduleId, messId, status: 'pending' },
    { status: 'void' },
    { new: true }
  ).populate(populateScheduleMembers).lean();
  if (!schedule) throw new AppError(404, 'Schedule not mutable');
  return normalizeAssignedMembers(schedule);
};

const completeSchedule = async (messId: string, scheduleId: string, payload: any, myMemberId: string, actorUserId: string, isManager: boolean) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const schedule = await MarketSchedule.findOne({ _id: scheduleId, messId, status: 'pending' }).session(session);
    if (!schedule) throw new AppError(404, 'Schedule not currently actionable');
    if (schedule.targetDate > getTodayDhakaNormalized()) {
      throw new AppError(400, 'Cannot complete a market schedule before its target date');
    }
    await assertBillingCycleOpenForDate(messId, new Date(), 'Cannot complete a market schedule while the current billing month is finalized');

    if (!isManager && !schedule.assignedTo.some(id => id.toString() === myMemberId)) {
      throw new AppError(403, 'Permission denied, only assigned members or managers can complete tasks');
    }

    schedule.status = 'completed';
    schedule.actualSpent = payload.actualSpent;
    schedule.completedAt = new Date();
    schedule.completedBy = new mongoose.Types.ObjectId(actorUserId);

    const expense = await Expense.create([{
      messId,
      category: 'bazar',
      amount: payload.actualSpent,
      date: new Date(),
      paidBy: new mongoose.Types.ObjectId(myMemberId),
      fundSource: payload.fundSource,
      status: 'pending'
    }], { session });

    schedule.expenseId = expense[0]._id;

    await schedule.save({ session });
    await session.commitTransaction();
    const populated = await MarketSchedule.findById(schedule._id).populate(populateScheduleMembers).lean();
    return normalizeAssignedMembers(populated);
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

export const updateScheduleStatus = async (messId: string, scheduleId: string, payload: any, myMemberId: string, actorUserId: string, isManager: boolean) => {
  if (payload.status === 'completed') return completeSchedule(messId, scheduleId, payload, myMemberId, actorUserId, isManager);
  if (payload.status === 'void') {
    if (!isManager) throw new AppError(403, 'Only managers can void market schedules');
    return voidSchedule(messId, scheduleId);
  }
  throw new AppError(400, 'Invalid schedule status');
};
