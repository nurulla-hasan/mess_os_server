import { Request, Response } from 'express';
import { catchAsync } from '../../shared/utils/asyncHandler';
import { sendResponse } from '../../shared/utils/apiResponse';
import * as mealService from './meal.service';

export const logMeal = catchAsync(async (req: Request, res: Response) => {
  const result = await mealService.createOrUpdateMeal(req.messId!, req.body.messMemberId, req.body.date, req.body.mealCount, req.user!.userId);
  sendResponse(res, { statusCode: 200, success: true, message: 'Meal count accurately logged', data: result });
});

export const listMeals = catchAsync(async (req: Request, res: Response) => {
  const result = await mealService.listMeals(req.messId!);
  sendResponse(res, { statusCode: 200, success: true, message: 'Meals listed', data: result });
});
