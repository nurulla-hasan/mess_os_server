import { Request, Response } from 'express';
import { catchAsync } from '../../shared/utils/asyncHandler';
import { sendResponse } from '../../shared/utils/apiResponse';
import * as ubService from './utility-bill.service';

export const createUtilityBill = catchAsync(async (req: Request, res: Response) => {
  const result = await ubService.createUtilityBill(req.messId!, req.body);
  sendResponse(res, { statusCode: 201, success: true, message: 'Utility bill added', data: result });
});

export const getUtilityBills = catchAsync(async (req: Request, res: Response) => {
  const result = await ubService.getUtilityBills(req.messId!);
  sendResponse(res, { statusCode: 200, success: true, message: 'Utility bills retrieved', data: result });
});

export const markPaid = catchAsync(async (req: Request, res: Response) => {
  const result = await ubService.markUtilityBillPaid(req.messId!, req.params.billId);
  sendResponse(res, { statusCode: 200, success: true, message: 'Utility bill explicitly tracked via cash ledger flow', data: result });
});
