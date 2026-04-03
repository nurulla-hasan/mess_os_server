import mongoose from 'mongoose';
import { AiShoppingList } from './ai-shopping.model';
import { MenuPlan } from '../menu-plan/menu-plan.model';
import { MarketSchedule } from '../market-schedule/market-schedule.model';
import { aiService } from '../../shared/services/aiService';
import { normalizeMealDate } from '../../shared/utils/dateUtils';
import { AppError } from '../../shared/utils/apiError';

export const generateShoppingList = async (messId: string, payload: any, userId: string) => {
  const menu = await MenuPlan.findOne({ _id: payload.menuPlanId, messId });
  if (!menu) throw new AppError(404, 'Menu plan not found');

  const generatedItems = await aiService.generateShoppingListItems(menu.meals);
  return await AiShoppingList.create({
    messId,
    menuPlanId: menu._id,
    targetDate: normalizeMealDate(payload.targetDate),
    items: generatedItems,
    status: 'draft',
    createdBy: new mongoose.Types.ObjectId(userId)
  });
};

export const getShoppingLists = async (messId: string) => {
  return await AiShoppingList.find({ messId }).sort({ targetDate: -1 });
};

export const getShoppingListById = async (messId: string, listId: string) => {
  const list = await AiShoppingList.findOne({ _id: listId, messId });
  if (!list) throw new AppError(404, 'List not found');
  return list;
};

export const approveShoppingList = async (messId: string, listId: string) => {
  const list = await AiShoppingList.findOneAndUpdate(
    { _id: listId, messId, status: 'draft' },
    { status: 'approved' },
    { new: true }
  );
  if (!list) throw new AppError(404, 'List not eligible for approval');
  return list;
};

export const rejectShoppingList = async (messId: string, listId: string) => {
  const list = await AiShoppingList.findOneAndUpdate(
    { _id: listId, messId, status: 'draft' },
    { status: 'rejected' },
    { new: true }
  );
  if (!list) throw new AppError(404, 'List not eligible for rejection');
  return list;
};

export const convertToMarketSchedule = async (messId: string, listId: string, userId: string, payload: any) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
     const list = await AiShoppingList.findOne({ _id: listId, messId, status: 'approved' }).session(session);
     if (!list) throw new AppError(404, 'List must be approved to be converted');
     
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
     return schedule[0];
  } catch(err) {
    await session.abortTransaction();
    throw err;
  } finally { 
    session.endSession();
  }
};
