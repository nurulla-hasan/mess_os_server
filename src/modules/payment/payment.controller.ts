import { Request, Response } from 'express';
import { catchAsync } from '../../shared/utils/asyncHandler';
import { sendResponse } from '../../shared/utils/apiResponse';
import { AppError } from '../../shared/utils/apiError';
import * as paymentService from './payment.service';

const getPaymentOwnerId = (payment: { messMemberId: unknown }): string => {
  const member = payment.messMemberId;
  if (typeof member === 'object' && member) {
    return String((member as Record<string, unknown>)._id);
  }
  return String(member);
};

export const createPayment = catchAsync(async (req: Request, res: Response) => {
  const messId = req.messId!;
  const body = req.body;
  const actor = req.messMember!;

  const actorMemberId = actor._id.toString();

  if (body.messMemberId && body.messMemberId !== actorMemberId) {
    if (actor.messRole !== 'manager') {
      throw new AppError(403, 'Unauthorized to create payments for other members directly');
    }
  } else {
    body.messMemberId = actorMemberId;
  }

  const result = await paymentService.createPayment(messId, body);
  sendResponse(res, { statusCode: 201, success: true, message: 'Payment record created successfully', data: result });
});

export const getPayments = catchAsync(async (req: Request, res: Response) => {
  const actor = req.messMember!;
  const isMyScope = req.query.scope === 'my';
  const query = actor.messRole === 'manager' && !isMyScope
    ? req.query
    : { ...req.query, messMemberId: actor._id.toString() };
  const result = await paymentService.getPayments(req.messId!, query);
  sendResponse(res, { statusCode: 200, success: true, message: 'Payments retrieved', meta: result.meta, data: result.data });
});

export const getPaymentById = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentService.getPaymentById(req.messId!, String(req.params.paymentId));
  
  // Safety check: Manager or Owner only
  const actor = req.messMember!;
  if (actor.messRole !== 'manager' && getPaymentOwnerId(result) !== actor._id.toString()) {
     throw new AppError(403, 'Unauthorized to view this specific payment record');
  }

  sendResponse(res, { statusCode: 200, success: true, message: 'Payment record fetched successfully', data: result });
});

export const updatePaymentStatus = catchAsync(async (req: Request, res: Response) => {
  const actor = req.messMember!;
  const result = await paymentService.updatePaymentStatus(
    req.messId!,
    String(req.params.paymentId),
    req.body.status,
    req.user!.userId,
    actor._id.toString(),
    actor.messRole
  );
  const messages: Record<string, string> = {
    approved: 'Payment approved and ledgered correctly',
    rejected: 'Payment record rejected by manager',
    canceled: 'Pending payment record canceled successfully',
  };
  sendResponse(res, { statusCode: 200, success: true, message: messages[req.body.status], data: result });
});
