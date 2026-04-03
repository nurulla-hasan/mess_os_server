import { Request, Response } from 'express';
import { catchAsync } from '../../shared/utils/asyncHandler';
import { sendResponse } from '../../shared/utils/apiResponse';
import { AppError } from '../../shared/utils/apiError';
import * as paymentService from './payment.service';

export const createPayment = catchAsync(async (req: Request, res: Response) => {
  const messId = req.messId!;
  const body = req.body;
  const actor = req.messMember!;

  if (body.messMemberId && body.messMemberId !== actor.id.toString()) {
    if (actor.messRole !== 'manager') {
      throw new AppError(403, 'Unauthorized to create payments for other members directly');
    }
  } else {
    body.messMemberId = actor.id.toString();
  }

  const result = await paymentService.createPayment(messId, body);
  sendResponse(res, { statusCode: 201, success: true, message: 'Payment record created natively reflecting accurately', data: result });
});

export const getPayments = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentService.getPayments(req.messId!, req.query);
  sendResponse(res, { statusCode: 200, success: true, message: 'Payments retrieved', data: result });
});

export const getPaymentById = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentService.getPaymentById(req.messId!, String(req.params.paymentId));
  
  // Safety check: Manager or Owner only
  const actor = req.messMember!;
  if (actor.messRole !== 'manager' && result.messMemberId.toString() !== actor.id.toString()) {
     throw new AppError(403, 'Unauthorized to view this specific payment record');
  }

  sendResponse(res, { statusCode: 200, success: true, message: 'Payment record accurately isolated', data: result });
});

export const getMyPayments = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentService.getPayments(req.messId!, { messMemberId: req.messMember!.id.toString() });
  sendResponse(res, { statusCode: 200, success: true, message: 'Your payment history extracted', data: result });
});

export const approvePayment = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentService.approvePayment(req.messId!, String(req.params.paymentId), req.user!.userId);
  sendResponse(res, { statusCode: 200, success: true, message: 'Payment approved and ledgered correctly', data: result });
});

export const rejectPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentService.rejectPayment(req.messId!, String(req.params.paymentId), req.user!.userId);
  sendResponse(res, { statusCode: 200, success: true, message: 'Payment record rejected by manager', data: result });
});

export const cancelPayment = catchAsync(async (req: Request, res: Response) => {
  const actor = req.messMember!;
  const result = await paymentService.cancelPayment(req.messId!, String(req.params.paymentId), actor.id.toString(), actor.messRole);
  sendResponse(res, { statusCode: 200, success: true, message: 'Pending payment record canceled successfully', data: result });
});
