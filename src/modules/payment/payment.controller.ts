import { Request, Response } from 'express';
import { catchAsync } from '../../shared/utils/asyncHandler';
import { sendResponse } from '../../shared/utils/apiResponse';
import * as paymentService from './payment.service';

export const createPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentService.createPayment(req.messId!, req.body);
  sendResponse(res, { statusCode: 201, success: true, message: 'Payment submitted', data: result });
});

export const getPayments = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentService.getPayments(req.messId!);
  sendResponse(res, { statusCode: 200, success: true, message: 'Payments retrieved', data: result });
});

export const approvePayment = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentService.approvePayment(req.messId!, req.params.paymentId, req.user!.userId);
  sendResponse(res, { statusCode: 200, success: true, message: 'Payment approved', data: result });
});
