import mongoose from 'mongoose';
import { MarketSchedule } from './market-schedule.model';
import { Expense } from '../expense/expense.model';
import { AppError } from '../../shared/utils/apiError';
import { normalizeMealDate } from '../../shared/utils/dateUtils';

export const createSchedule = async (messId: string, payload: any, userId: string) => {
  return await MarketSchedule.create({
    messId,
    ...payload,
    targetDate: normalizeMealDate(payload.targetDate),
    status: 'pending',
    createdBy: new mongoose.Types.ObjectId(userId)
  });
};

export const getSchedules = async (messId: string) => {
  return await MarketSchedule.find({ messId }).sort({ targetDate: -1 });
};

export const getMyDuties = async (messId: string, myMemberId: string) => {
  return await MarketSchedule.find({ messId, assignedTo: new mongoose.Types.ObjectId(myMemberId) }).sort({ targetDate: -1 });
};

export const updateSchedule = async (messId: string, scheduleId: string, payload: any) => {
  const schedule = await MarketSchedule.findOneAndUpdate(
    { _id: scheduleId, messId, status: 'pending' },
    payload,
    { new: true, runValidators: true }
  );
  if (!schedule) throw new AppError(404, 'Schedule not found or not mutable');
  return schedule;
};

export const reassignSchedule = async (messId: string, scheduleId: string, assignedTo: string[]) => {
  const schedule = await MarketSchedule.findOneAndUpdate(
    { _id: scheduleId, messId, status: 'pending' },
    { assignedTo: assignedTo.map((id: string) => new mongoose.Types.ObjectId(id)) },
    { new: true, runValidators: true }
  );
  if (!schedule) throw new AppError(404, 'Schedule not mutable');
  return schedule;
};

export const updateActualSpent = async (messId: string, scheduleId: string, actualSpent: number, myMemberId: string, isManager: boolean) => {
  const schedule = await MarketSchedule.findOne({ _id: scheduleId, messId, status: 'pending' });
  if (!schedule) throw new AppError(404, 'Schedule not mutable');
  
  if (!isManager && !schedule.assignedTo.some(id => id.toString() === myMemberId)) {
    throw new AppError(403, 'Permission denied, only managers or assigned members can update spent');
  }

  schedule.actualSpent = actualSpent;
  await schedule.save();
  return schedule;
};

export const voidSchedule = async (messId: string, scheduleId: string) => {
  const schedule = await MarketSchedule.findOneAndUpdate(
    { _id: scheduleId, messId, status: 'pending' },
    { status: 'void' },
    { new: true }
  );
  if (!schedule) throw new AppError(404, 'Schedule not mutable');
  return schedule;
};

export const completeSchedule = async (messId: string, scheduleId: string, payload: any, myMemberId: string, actorUserId: string, isManager: boolean) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const schedule = await MarketSchedule.findOne({ _id: scheduleId, messId, status: 'pending' }).session(session);
    if (!schedule) throw new AppError(404, 'Schedule not currently actionable');

    if (!isManager && payload.actorMessMemberId !== myMemberId) {
      throw new AppError(403, 'Permission denied, you can only claim expenses paid by yourself');
    }

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
      paidBy: new mongoose.Types.ObjectId(payload.actorMessMemberId),
      fundSource: payload.fundSource,
      status: 'pending'
    }], { session });

    schedule.expenseId = expense[0]._id;

    await schedule.save({ session });
    await session.commitTransaction();
    return schedule;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};
