import { Request, Response } from 'express';
import { catchAsync } from '../../shared/utils/asyncHandler';
import { sendResponse } from '../../shared/utils/apiResponse';
import * as subService from './subscription.service';

export const getAvailablePlans = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Plans exported statically', data: await subService.getAvailablePlans() });
});

export const getCurrentPlan = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Plan localized correctly', data: await subService.getCurrentPlan(req.messId!) });
});

export const startTrial = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 201, success: true, message: 'Trial initialized completely externally safely bound', data: await subService.startTrial(req.messId!) });
});

export const subscribePlan = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Subscription successfully linked checking live verification', data: await subService.subscribePlan(req.messId!, req.body.planId, req.body.paymentToken) });
});

export const cancelSubscription = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Subscription marked canceled downstream', data: await subService.cancelSubscription(req.messId!) });
});

export const getHistory = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Historical extraction mapped safely', data: await subService.getSubscriptionHistory(req.messId!) });
});
