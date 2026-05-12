import { Request, Response } from 'express';
import { catchAsync } from '../../shared/utils/asyncHandler';
import { sendResponse } from '../../shared/utils/apiResponse';
import * as managerRequestService from './manager-request.service';

export const createManagerRequest = catchAsync(async (req: Request, res: Response) => {
  const request = await managerRequestService.createManagerRequest(req.user!.userId, req.body.reason);
  sendResponse(res, { statusCode: 201, success: true, message: 'Manager access request submitted successfully', data: request });
});

export const getMyManagerRequest = catchAsync(async (req: Request, res: Response) => {
  const request = await managerRequestService.getMyManagerRequest(req.user!.userId);
  sendResponse(res, { statusCode: 200, success: true, message: 'Manager access request retrieved successfully', data: request });
});

export const listManagerRequests = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(String(req.query.page)) || 1;
  const limit = parseInt(String(req.query.limit)) || 10;
  const status = req.query.status as 'pending' | 'approved' | 'rejected' | undefined;
  const searchTerm = req.query.searchTerm as string | undefined;
  const result = await managerRequestService.listManagerRequests({ status, searchTerm, page, limit });
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Manager access requests retrieved successfully',
    meta: result.pagination,
    data: result.items,
  });
});

export const reviewManagerRequest = catchAsync(async (req: Request, res: Response) => {
  const request = await managerRequestService.reviewManagerRequest(
    String(req.params.requestId),
    req.user!.userId,
    req.body.status,
    req.body.adminNote
  );
  sendResponse(res, { statusCode: 200, success: true, message: `Manager access request ${req.body.status} successfully`, data: request });
});
