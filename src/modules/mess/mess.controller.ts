import { Request, Response } from 'express';
import { catchAsync } from '../../shared/utils/asyncHandler';
import { sendResponse } from '../../shared/utils/apiResponse';
import * as messService from './mess.service';

export const createMess = catchAsync(async (req: Request, res: Response) => {
  const mess = await messService.createMess(req.user!.userId, req.body);
  sendResponse(res, { statusCode: 201, success: true, message: 'Mess created successfully', data: mess });
});

export const getMess = catchAsync(async (req: Request, res: Response) => {
  const mess = await messService.getMess(req.messId!);
  sendResponse(res, { statusCode: 200, success: true, message: 'Mess fetched successfully', data: mess });
});

export const getDashboard = catchAsync(async (req: Request, res: Response) => {
  const result = await messService.getDashboard(req.messId!);
  sendResponse(res, { statusCode: 200, success: true, message: 'Manager dashboard loaded', data: result });
});

export const getMemberDashboard = catchAsync(async (req: Request, res: Response) => {
  const result = await messService.getMemberDashboard(req.messId!, req.messMember!._id.toString(), req.messRole!);
  sendResponse(res, { statusCode: 200, success: true, message: 'Member dashboard loaded', data: result });
});

export const updateMess = catchAsync(async (req: Request, res: Response) => {
  const mess = await messService.updateMess(req.messId!, req.body);
  sendResponse(res, { statusCode: 200, success: true, message: 'Mess updated successfully', data: mess });
});

export const regenerateInviteCode = catchAsync(async (req: Request, res: Response) => {
  const mess = await messService.regenerateInviteCode(req.messId!);
  sendResponse(res, { statusCode: 200, success: true, message: 'Invite code regenerated successfully', data: mess });
});

export const transferOwnership = catchAsync(async (req: Request, res: Response) => {
  const result = await messService.transferOwnership(req.messId!, req.user!.userId, req.body.newManagerUserId);
  sendResponse(res, { statusCode: 200, success: true, message: 'Ownership transferred successfully', data: result });
});
