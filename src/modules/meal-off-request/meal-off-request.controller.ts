import { Request, Response } from 'express';
import { catchAsync } from '../../shared/utils/asyncHandler';
import { sendResponse } from '../../shared/utils/apiResponse';
import * as morService from './meal-off-request.service';

export const createRequest = catchAsync(async (req: Request, res: Response) => {
  const result = await morService.createRequest(req.messId!, req.body);
  sendResponse(res, { statusCode: 201, success: true, message: 'Meal off request submitted safely', data: result });
});

export const listRequests = catchAsync(async (req: Request, res: Response) => {
  const start = req.query.start ? String(req.query.start) : req.query.startDate ? String(req.query.startDate) : undefined;
  const end = req.query.end ? String(req.query.end) : req.query.endDate ? String(req.query.endDate) : undefined;
  const result = await morService.listRequests(req.messId!, {
    page: parseInt(String(req.query.page)) || 1,
    limit: parseInt(String(req.query.limit)) || 10,
    status: req.query.status ? String(req.query.status) as morService.MealOffRequestStatus : undefined,
    messMemberId: req.query.messMemberId ? String(req.query.messMemberId) : req.query.memberId ? String(req.query.memberId) : undefined,
    searchTerm: req.query.searchTerm ? String(req.query.searchTerm) : undefined,
    start,
    end,
    requesterMemberId: req.messMember?._id.toString(),
    requesterRole: req.messRole as 'manager' | 'member' | undefined,
    isSuperAdmin: req.user?.globalRole === 'super_admin',
  });
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Meal off requests listed',
    meta: result.pagination,
    data: result.items,
  });
});

export const reviewRequest = catchAsync(async (req: Request, res: Response) => {
  const result = await morService.reviewRequest(req.messId!, String(req.params.requestId), req.user!.userId, req.body.status);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: req.body.status === 'approved' ? 'Request approved' : 'Request rejected',
    data: result,
  });
});
