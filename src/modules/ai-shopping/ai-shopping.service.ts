import mongoose from 'mongoose';
import { AiShoppingList } from './ai-shopping.model';
import { MenuPlan } from '../menu-plan/menu-plan.model';
import { MarketSchedule } from '../market-schedule/market-schedule.model';
import { MessMember } from '../mess-member/mess-member.model';
import { aiService } from '../../shared/services/aiService';
import { isBeforeTodayDhaka, normalizeMealDate } from '../../shared/utils/dateUtils';
import { AppError } from '../../shared/utils/apiError';
import { GenerateListPayload, ConvertListPayload, ListAiShoppingQuery } from './ai-shopping.validation';

const populateScheduleMembers = {
  path: 'assignedTo',
  select: 'userId messRole status',
  populate: { path: 'userId', select: 'fullName email phone avatarUrl' },
};

const normalizeMember = (member: Record<string, unknown>): Record<string, unknown> => {
  if (!member?.userId) return member;
  const { userId, ...rest } = member;
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
    throw new AppError(400, 'Shopping list can only be assigned to active members of this mess');
  }
};

export const generateShoppingList = async (messId: string, payload: GenerateListPayload, userId: string) => {
  const menu = await MenuPlan.findOne({ _id: payload.menuPlanId, messId });
  if (!menu) throw new AppError(404, 'Menu plan not found');
  const targetDate = normalizeMealDate(payload.targetDate);
  if (isBeforeTodayDhaka(targetDate)) throw new AppError(400, 'Shopping list target date cannot be in the past');

  const generatedItems = await aiService.generateShoppingListItems(messId, menu.meals);
  return await AiShoppingList.create({
    messId,
    menuPlanId: menu._id,
    targetDate,
    items: generatedItems,
    status: 'draft',
    createdBy: new mongoose.Types.ObjectId(userId)
  });
};

export const getShoppingLists = async (messId: string, options: ListAiShoppingQuery = {}) => {
  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 20;
  const query: Record<string, unknown> = { messId };
  if (options.status) query.status = options.status;

  const [data, total] = await Promise.all([
    AiShoppingList.find(query).sort({ targetDate: -1 }).skip((page - 1) * limit).limit(limit),
    AiShoppingList.countDocuments(query),
  ]);

  return { meta: { page, limit, total, totalPages: Math.ceil(total / limit) }, data };
};

export const getShoppingListById = async (messId: string, listId: string) => {
  const list = await AiShoppingList.findOne({ _id: listId, messId });
  if (!list) throw new AppError(404, 'List not found');
  return list;
};

const approveShoppingList = async (messId: string, listId: string) => {
  const list = await AiShoppingList.findOneAndUpdate(
    { _id: listId, messId, status: 'draft' },
    { status: 'approved' },
    { new: true }
  );
  if (!list) throw new AppError(404, 'List not eligible for approval');
  return list;
};

const rejectShoppingList = async (messId: string, listId: string) => {
  const list = await AiShoppingList.findOneAndUpdate(
    { _id: listId, messId, status: 'draft' },
    { status: 'rejected' },
    { new: true }
  );
  if (!list) throw new AppError(404, 'List not eligible for rejection');
  return list;
};

export const updateShoppingListStatus = async (messId: string, listId: string, status: 'approved' | 'rejected') => {
  if (status === 'approved') return approveShoppingList(messId, listId);
  if (status === 'rejected') return rejectShoppingList(messId, listId);
  throw new AppError(400, 'Invalid shopping list status');
};

export const convertToMarketSchedule = async (messId: string, listId: string, userId: string, payload: ConvertListPayload) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
     await assertActiveAssignedMembers(messId, payload.assignedTo);
     const list = await AiShoppingList.findOne({ _id: listId, messId, status: 'approved' }).session(session);
     if (!list) throw new AppError(404, 'List must be approved to be converted');
     if (isBeforeTodayDhaka(list.targetDate)) throw new AppError(400, 'Cannot convert a shopping list with a past target date');
     
     // Prevent duplicate schedule for the same date
     const existingSchedule = await MarketSchedule.findOne({ messId, targetDate: list.targetDate }).session(session);
     if (existingSchedule) throw new AppError(409, 'A market schedule already exists for this date');

     list.status = 'converted';
     
     const schedule = await MarketSchedule.create([{
       messId,
       assignedTo: payload.assignedTo.map((id: string) => new mongoose.Types.ObjectId(id)),
       targetDate: list.targetDate,
       shoppingItems: list.items.map(item => ({ name: item.name, quantity: item.quantity })),
       estimatedBudget: payload.estimatedBudget,
       status: 'pending',
       createdBy: new mongoose.Types.ObjectId(userId)
     }], { session });

     list.marketScheduleId = schedule[0]._id;
     await list.save({ session });
     await session.commitTransaction();

     const populated = await MarketSchedule.findById(schedule[0]._id)
       .populate(populateScheduleMembers)
       .lean();
     return normalizeAssignedMembers(populated as unknown as Record<string, unknown>);
  } catch(err) {
    await session.abortTransaction();
    throw err;
  } finally { 
    session.endSession();
  }
};
