import { Request, Response } from 'express';
import { catchAsync } from '../../shared/utils/asyncHandler';
import { sendResponse } from '../../shared/utils/apiResponse';
import * as userService from './user.service';

export const getMe = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Me extracted securely correctly validated consistently', data: await userService.getUser(req.user!.userId) });
});

export const updateMe = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Me accurately updated robustly internally modified correctly', data: await userService.updateUser(req.user!.userId, req.body) });
});

export const updateAvatar = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Avatar accurately updated robustly internally modified correctly', data: await userService.updateUser(req.user!.userId, { avatarUrl: req.body.avatarUrl }) });
});
