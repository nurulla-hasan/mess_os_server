import mongoose from 'mongoose';
import { MarketSchedule } from './market-schedule.model';
import { MenuPlan } from '../menu-plan/menu-plan.model';
import { Expense } from '../expense/expense.model';
import { AiShoppingList } from '../ai-shopping/ai-shopping.model';
import { AppError } from '../../shared/utils/apiError';
import { getTodayDhakaNormalized, isBeforeTodayDhaka, normalizeMealDate } from '../../shared/utils/dateUtils';
import { MessMember } from '../mess-member/mess-member.model';
import { assertBillingCycleOpenForDate } from '../billing/billing-lock.service';
import { aiService } from '../../shared/services/aiService';
import type { CreateMarketSchedulePayload, UpdateMarketSchedulePayload, UpdateMarketScheduleStatusPayload } from './market-schedule.validation';

const populateScheduleMembers = {
  path: 'assignedTo',
  select: 'userId messRole status',
  populate: { path: 'userId', select: 'fullName email phone avatarUrl' },
};

const normalizeMember = (member: Record<string, unknown>): Record<string, unknown> => {
  if (!member?.userId) return member;
  const { userId, ...rest } = member;
  // Rename avatarUrl → avatar to match IMember.user.avatar on the client
  const user = userId as Record<string, unknown>;
  if (user && typeof user === 'object' && 'avatarUrl' in user) {
    user.avatar = user.avatarUrl;
    delete user.avatarUrl;
  }
  return { ...rest, user };
};

const normalizeAssignedMembers = (schedule: Record<string, unknown>): Record<string, unknown> => {
  if (Array.isArray(schedule)) {
    return schedule.map((item) => normalizeAssignedMembers(item as Record<string, unknown>)) as unknown as Record<string, unknown>;
  }
  const assignedTo = schedule.assignedTo;
  if (!Array.isArray(assignedTo)) return schedule;
  return { ...schedule, assignedTo: assignedTo.map(normalizeMember) };
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

export const generateItemsFromMenu = async (messId: string, payload: { date: string; personCount?: number; shoppingDays?: number }) => {
  const targetDate = normalizeMealDate(payload.date);
  
  const menuPlan = await MenuPlan.findOne({ messId, date: targetDate }).select('meals').lean();
  if (!menuPlan || !menuPlan.meals) {
    throw new AppError(404, 'No menu plan found for this date. Generate a menu plan first.');
  }
  
  const meals = menuPlan.meals instanceof Map
    ? Object.fromEntries(menuPlan.meals as Map<string, string>)
    : menuPlan.meals as Record<string, string>;

  if (!Object.keys(meals).length) {
    throw new AppError(404, 'Menu plan exists but has no meals defined.');
  }

  const aiItems = await aiService.generateShoppingListItems(meals);
  
  return aiItems.map((item) => ({ name: item.name, quantity: item.quantity }));
};

export const createSchedule = async (messId: string, payload: CreateMarketSchedulePayload, userId: string) => {
  const { aiShoppingListId, ...schedulePayload } = payload;

  await assertActiveAssignedMembers(messId, schedulePayload.assignedTo);
  const targetDate = normalizeMealDate(schedulePayload.targetDate);
  if (isBeforeTodayDhaka(targetDate)) throw new AppError(400, 'Market schedule date cannot be in the past');

  // Prevent duplicate schedules for the same date
  const existingSchedule = await MarketSchedule.findOne({ messId, targetDate });
  if (existingSchedule) throw new AppError(409, 'A market schedule already exists for this date');

  const commonScheduleData = {
    messId,
    assignedTo: schedulePayload.assignedTo.map((id: string) => new mongoose.Types.ObjectId(id)),
    targetDate,
    shoppingItems: schedulePayload.shoppingItems,
    estimatedBudget: schedulePayload.estimatedBudget,
    status: 'pending' as const,
    createdBy: new mongoose.Types.ObjectId(userId),
  };

  // If an AI shopping list was selected, mark it as converted in a transaction
  if (aiShoppingListId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const [schedule] = await MarketSchedule.create([commonScheduleData], { session });

      const aiList = await AiShoppingList.findOne({ _id: aiShoppingListId, messId }).session(session);
      if (aiList && aiList.status !== 'converted') {
        aiList.status = 'converted';
        aiList.marketScheduleId = schedule._id;
        await aiList.save({ session });
      }

      await session.commitTransaction();
      const populated = await MarketSchedule.findById(schedule._id).populate(populateScheduleMembers).lean();
      return normalizeAssignedMembers(populated as unknown as Record<string, unknown>);
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  // No AI list — simple create
  const schedule = await MarketSchedule.create(commonScheduleData);
  const populated = await MarketSchedule.findById(schedule._id).populate(populateScheduleMembers).lean();
  return normalizeAssignedMembers(populated as unknown as Record<string, unknown>);
};

interface ListScheduleOptions {
  page?: string;
  limit?: string;
  status?: string;
}

const listSchedules = async (query: Record<string, unknown>, options: ListScheduleOptions = {}) => {
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
  return { meta: { page, limit, total, totalPages: Math.ceil(total / limit) }, data: data.map((d) => normalizeAssignedMembers(d as unknown as Record<string, unknown>)) };
};

export const getSchedules = async (messId: string, options: ListScheduleOptions = {}) => {
  const query: Record<string, unknown> = { messId };
  if (options.status) query.status = options.status;
  return listSchedules(query, options);
};

export const getMyDuties = async (messId: string, myMemberId: string, options: ListScheduleOptions = {}) => {
  const query: Record<string, unknown> = { messId, assignedTo: new mongoose.Types.ObjectId(myMemberId) };
  if (options.status) query.status = options.status;
  return listSchedules(query, options);
};

export const updateSchedule = async (messId: string, scheduleId: string, payload: UpdateMarketSchedulePayload) => {
  if (payload.assignedTo) await assertActiveAssignedMembers(messId, payload.assignedTo);
  const schedule = await MarketSchedule.findOneAndUpdate(
    { _id: scheduleId, messId, status: 'pending' },
    payload,
    { new: true, runValidators: true }
  ).populate(populateScheduleMembers).lean();
  if (!schedule) throw new AppError(404, 'Schedule not found or not mutable');
  return normalizeAssignedMembers(schedule as unknown as Record<string, unknown>);
};

const voidSchedule = async (messId: string, scheduleId: string) => {
  const schedule = await MarketSchedule.findOneAndUpdate(
    { _id: scheduleId, messId, status: 'pending' },
    { status: 'void' },
    { new: true }
  ).populate(populateScheduleMembers).lean();
  if (!schedule) throw new AppError(404, 'Schedule not mutable');
  return normalizeAssignedMembers(schedule as unknown as Record<string, unknown>);
};

const completeSchedule = async (messId: string, scheduleId: string, payload: UpdateMarketScheduleStatusPayload, myMemberId: string, actorUserId: string, isManager: boolean) => {
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
    return normalizeAssignedMembers(populated as unknown as Record<string, unknown>);
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

export const updateScheduleStatus = async (messId: string, scheduleId: string, payload: UpdateMarketScheduleStatusPayload, myMemberId: string, actorUserId: string, isManager: boolean) => {
  if (payload.status === 'completed') return completeSchedule(messId, scheduleId, payload, myMemberId, actorUserId, isManager);
  if (payload.status === 'void') {
    if (!isManager) throw new AppError(403, 'Only managers can void market schedules');
    return voidSchedule(messId, scheduleId);
  }
  throw new AppError(400, 'Invalid schedule status');
};
