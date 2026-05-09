import { Request, Response } from 'express';
import { catchAsync } from '../../shared/utils/asyncHandler';
import { sendResponse } from '../../shared/utils/apiResponse';
import * as adminService from './admin.service';

export const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(String(req.query.page)) || 1;
  const limit = parseInt(String(req.query.limit)) || 20;
  const searchTerm = req.query.searchTerm as string | undefined;
  const result = await adminService.getAllUsers(page, limit, searchTerm);
  sendResponse(res, { statusCode: 200, success: true, message: 'Platform users retrieved', meta: result.pagination, data: result.items });
});

export const getAllMesses = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(String(req.query.page)) || 1;
  const limit = parseInt(String(req.query.limit)) || 20;
  const searchTerm = req.query.searchTerm as string | undefined;
  const status = req.query.status as 'active' | 'suspended' | undefined;
  const result = await adminService.getAllMesses(page, limit, searchTerm, status);
  sendResponse(res, { statusCode: 200, success: true, message: 'Platform messes retrieved', meta: result.pagination, data: result.items });
});

export const getStats = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Platform statistics retrieved', data: await adminService.getPlatformStats() });
});

export const getAnalytics = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Platform analytics retrieved', data: await adminService.getPlatformAnalytics() });
});

export const getAllSubscriptions = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(String(req.query.page)) || 1;
  const limit = parseInt(String(req.query.limit)) || 20;
  const result = await adminService.getAllSubscriptions(page, limit, {
    searchTerm: req.query.searchTerm as string | undefined,
    status: req.query.status as 'active' | 'past_due' | 'canceled' | 'unpaid' | undefined,
    planId: req.query.planId as string | undefined,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Platform subscriptions retrieved',
    meta: result.pagination,
    data: result.items,
  });
});

export const updateUserRole = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'User role escalated/de-escalated', data: await adminService.updateUserRole(String(req.params.userId), req.body.globalRole) });
});

export const blockUser = catchAsync(async (req: Request, res: Response) => {
  const statusMessage = req.body.status === 'blocked' ? 'User blocked' : 'User unblocked';
  sendResponse(res, { statusCode: 200, success: true, message: statusMessage, data: await adminService.blockUser(String(req.params.userId), req.body.status) });
});

export const suspendMess = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Mess status updated successfully',
    data: await adminService.updateMessStatus(String(req.params.messId), req.body.status, req.user!.userId, req.body.suspensionNote)
  });
});
