import { Request, Response } from 'express';
import { catchAsync } from '../../shared/utils/asyncHandler';
import { sendResponse } from '../../shared/utils/apiResponse';
import * as mealService from './meal.service';

export const logMeal = catchAsync(async (req: Request, res: Response) => {
  const result = await mealService.createOrUpdateMeal(
    req.messId!,
    req.body.messMemberId,
    req.body.date,
    req.body.mealCount,
    req.body.meals,
    req.user!.userId
  );
  sendResponse(res, { statusCode: 200, success: true, message: 'Meal count logged successfully', data: result });
});

export const bulkLogMeals = catchAsync(async (req: Request, res: Response) => {
  const result = await mealService.bulkCreateOrUpdateMeals(req.messId!, req.body.date, req.body.entries, req.user!.userId);
  sendResponse(res, { statusCode: 200, success: true, message: 'Meal counts logged successfully', data: result });
});

export const listMeals = catchAsync(async (req: Request, res: Response) => {
  const start = req.query.start ? String(req.query.start) : req.query.startDate ? String(req.query.startDate) : undefined;
  const end = req.query.end ? String(req.query.end) : req.query.endDate ? String(req.query.endDate) : undefined;
  const result = await mealService.listMeals(req.messId!, {
    page: parseInt(String(req.query.page)) || 1,
    limit: parseInt(String(req.query.limit)) || 10,
    memberId: req.query.memberId ? String(req.query.memberId) : undefined,
    searchTerm: req.query.searchTerm ? String(req.query.searchTerm) : undefined,
    start,
    end,
    requesterMemberId: req.messMember?._id.toString(),
    requesterRole: req.messRole as 'manager' | 'member' | undefined,
    isSuperAdmin: req.user?.globalRole === 'super_admin',
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Meals listed',
    meta: { ...result.pagination, summary: result.summary },
    data: result.items,
  });
});
