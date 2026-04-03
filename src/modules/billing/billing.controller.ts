import { Request, Response } from 'express';
import { catchAsync } from '../../shared/utils/asyncHandler';
import { sendResponse } from '../../shared/utils/apiResponse';
import * as billingService from './billing.service';

export const getBillingCycles = catchAsync(async (req: Request, res: Response) => {
  const result = await billingService.getBillingCycles(req.messId!);
  sendResponse(res, { statusCode: 200, success: true, message: 'Billing cycles retrieved', data: result });
});

export const getMemberBills = catchAsync(async (req: Request, res: Response) => {
  const result = await billingService.getMemberBills(req.messId!, req.params.billingCycleId);
  sendResponse(res, { statusCode: 200, success: true, message: 'Member bills retrieved', data: result });
});

export const previewBilling = catchAsync(async (req: Request, res: Response) => {
  const { month, year } = req.body;
  const result = await billingService.previewBillingCycle(req.messId!, parseInt(month), parseInt(year));
  sendResponse(res, { statusCode: 200, success: true, message: 'Billing cycle preview fully mapped', data: result });
});

export const finalizeBilling = catchAsync(async (req: Request, res: Response) => {
  const { month, year } = req.body;
  const result = await billingService.finalizeBillingCycle(req.messId!, parseInt(month), parseInt(year), req.user!.userId);
  sendResponse(res, { statusCode: 200, success: true, message: 'Billing cycle successfully locked', data: result });
});

export const reopenBilling = catchAsync(async (req: Request, res: Response) => {
  const result = await billingService.reopenBillingCycle(req.messId!, req.params.billingCycleId);
  sendResponse(res, { statusCode: 200, success: true, message: result.message });
});
