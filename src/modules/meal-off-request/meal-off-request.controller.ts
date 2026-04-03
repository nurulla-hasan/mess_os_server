import { Request, Response } from 'express';
import { catchAsync } from '../../shared/utils/asyncHandler';
import { sendResponse } from '../../shared/utils/apiResponse';
import * as morService from './meal-off-request.service';

export const createRequest = catchAsync(async (req: Request, res: Response) => {
  const result = await morService.createRequest(req.messId!, req.body);
  sendResponse(res, { statusCode: 201, success: true, message: 'Meal off request submitted safely', data: result });
});

export const listRequests = catchAsync(async (req: Request, res: Response) => {
  const result = await morService.listRequests(req.messId!);
  sendResponse(res, { statusCode: 200, success: true, message: 'Meal off requests listed', data: result });
});

export const approveRequest = catchAsync(async (req: Request, res: Response) => {
  const result = await morService.approveRequest(req.messId!, String(req.params.requestId), req.user!.userId);
  sendResponse(res, { statusCode: 200, success: true, message: 'Request approved', data: result });
});

export const rejectRequest = catchAsync(async (req: Request, res: Response) => {
  const result = await morService.rejectRequest(req.messId!, String(req.params.requestId), req.user!.userId);
  sendResponse(res, { statusCode: 200, success: true, message: 'Request rejected', data: result });
});
