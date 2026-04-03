import { MealOffRequest } from './meal-off-request.model';
import { Meal } from '../meal/meal.model';
import { AppError } from '../../shared/utils/apiError';
import { normalizeMealDate, getDhakaNow, generateDateRange } from '../../shared/utils/dateUtils';
import mongoose from 'mongoose';

export const createRequest = async (messId: string, payload: { messMemberId: string, startDate: string, endDate: string, reason?: string }) => {
  const sDate = normalizeMealDate(payload.startDate);
  const eDate = normalizeMealDate(payload.endDate);
  
  if (eDate < sDate) throw new AppError(400, 'End date must be after or same as start date');

  return await MealOffRequest.create({ messId, messMemberId: payload.messMemberId, startDate: sDate, endDate: eDate, reason: payload.reason, status: 'pending' });
};

export const listRequests = async (messId: string) => {
  return await MealOffRequest.find({ messId }).sort({ startDate: 1 });
};

export const approveRequest = async (messId: string, requestId: string, managerUserId: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const req = await MealOffRequest.findOne({ _id: requestId, messId, status: 'pending' }).session(session);
    if (!req) throw new AppError(404, 'Pending request not found');

    req.status = 'approved';
    req.approvedBy = new mongoose.Types.ObjectId(managerUserId);

    // Business Rule: Future dates managed automatically. Past dates ignored requiring explicit human review.
    const todayNormalized = normalizeMealDate(getDhakaNow());
    const datesToLock = generateDateRange(req.startDate, req.endDate);

    const automatedMealPromises = datesToLock.map(d => {
       if (d >= todayNormalized) {
         return Meal.findOneAndUpdate(
           { messId, messMemberId: req.messMemberId, date: d },
           { mealCount: 0, createdBy: new mongoose.Types.ObjectId(managerUserId) },
           { new: true, upsert: true, runValidators: true, session }
         );
       }
       return Promise.resolve(null);
    });

    await Promise.all(automatedMealPromises);
    await req.save({ session });
    await session.commitTransaction();
    return req;
  } catch(err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

export const rejectRequest = async (messId: string, requestId: string, managerUserId: string) => {
  const req = await MealOffRequest.findOneAndUpdate(
    { _id: requestId, messId, status: 'pending' },
    { status: 'rejected', approvedBy: new mongoose.Types.ObjectId(managerUserId) },
    { new: true, runValidators: true }
  );
  if (!req) throw new AppError(404, 'Pending request not found');
  return req;
};
