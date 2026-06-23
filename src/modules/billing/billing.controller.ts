import { Request, Response } from 'express';
import { catchAsync } from '../../shared/utils/asyncHandler';
import { sendResponse } from '../../shared/utils/apiResponse';
import * as billingService from './billing.service';
import { AppError } from '../../shared/utils/apiError';

export const getBillingCycles = catchAsync(async (req: Request, res: Response) => {
  const result = await billingService.getBillingCycles(req.messId!);
  sendResponse(res, { statusCode: 200, success: true, message: 'Billing cycles retrieved', data: result });
});

export const getMemberBills = catchAsync(async (req: Request, res: Response) => {
  const includeHistory = req.query.history === 'true';
  const role = req.messRole ?? req.user?.globalRole;

  if (includeHistory && role !== 'manager' && role !== 'super_admin') {
    throw new AppError(403, 'Billing history is restricted to managers only');
  }

  const targetMemberId = (role === 'member') ? String(req.messMember?._id) : undefined;

  const result = await billingService.getMemberBills(req.messId!, String(req.params.billingCycleId), targetMemberId, includeHistory);
  sendResponse(res, { statusCode: 200, success: true, message: 'Member bills retrieved', data: result });
});

export const getMyBill = catchAsync(async (req: Request, res: Response) => {
  const result = await billingService.getMemberBills(req.messId!, String(req.params.billingCycleId), String(req.messMember?._id), false);
  // Return the first object since it's a specific member's bill
  const bill = result.length > 0 ? result[0] : null;
  sendResponse(res, { statusCode: 200, success: true, message: 'My bill retrieved', data: bill });
});

export const previewBilling = catchAsync(async (req: Request, res: Response) => {
  const { month, year } = req.body as { month: number; year: number };
  const result = await billingService.previewBillingCycle(req.messId!, month, year);
  sendResponse(res, { statusCode: 200, success: true, message: 'Billing cycle preview generated successfully', data: result });
});

export const finalizeBilling = catchAsync(async (req: Request, res: Response) => {
  const { month, year } = req.body as { month: number; year: number };
  const result = await billingService.finalizeBillingCycle(req.messId!, month, year, req.user!.userId);
  sendResponse(res, { statusCode: 200, success: true, message: 'Billing cycle finalized successfully', data: result });
});

export const reopenBilling = catchAsync(async (req: Request, res: Response) => {
  const result = await billingService.reopenBillingCycle(req.messId!, String(req.params.billingCycleId));
  sendResponse(res, { statusCode: 200, success: true, message: result.message });
});
