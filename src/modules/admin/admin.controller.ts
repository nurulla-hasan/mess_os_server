import { Request, Response } from 'express';
import { catchAsync } from '../../shared/utils/asyncHandler';
import { sendResponse } from '../../shared/utils/apiResponse';
import * as adminService from './admin.service';

export const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(String(req.query.page)) || 1;
  const limit = parseInt(String(req.query.limit)) || 20;
  sendResponse(res, { statusCode: 200, success: true, message: 'Platform users retrieved', data: await adminService.getAllUsers(page, limit) });
});

export const getAllMesses = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(String(req.query.page)) || 1;
  const limit = parseInt(String(req.query.limit)) || 20;
  sendResponse(res, { statusCode: 200, success: true, message: 'Platform messes retrieved', data: await adminService.getAllMesses(page, limit) });
});

export const getStats = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Platform statistics retrieved', data: await adminService.getPlatformStats() });
});

export const updateUserRole = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'User role escalated/de-escalated', data: await adminService.updateUserRole(String(req.params.userId), req.body.globalRole) });
});

export const blockUser = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'User explicitly blocked from platform', data: await adminService.blockUser(String(req.params.userId)) });
});

export const suspendMess = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Mess securely suspended globally', data: await adminService.suspendMess(String(req.params.messId)) });
});
