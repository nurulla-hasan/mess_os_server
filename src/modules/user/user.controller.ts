import { Request, Response } from 'express';
import { catchAsync } from '../../shared/utils/asyncHandler';
import { sendResponse } from '../../shared/utils/apiResponse';
import * as userService from './user.service';
import { uploadToCloudinary, deleteFromCloudinary } from '../../shared/services/cloudinaryUpload';

export const getMe = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Me extracted securely correctly validated consistently', data: await userService.getUser(req.user!.userId) });
});

export const updateMe = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Me accurately updated robustly internally modified correctly', data: await userService.updateUser(req.user!.userId, req.body) });
});

export const updateAvatar = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) {
    sendResponse(res, { statusCode: 400, success: false, message: 'No avatar file provided', data: null });
    return;
  }

  const user = await userService.getUser(req.user!.userId);
  
  const { secureUrl, publicId } = await uploadToCloudinary(req.file.buffer, 'avatars');
  
  if (user.avatarPublicId) {
    try {
      await deleteFromCloudinary(user.avatarPublicId);
    } catch {
      // Silent fail - old avatar deletion is not critical
    }
  }
  
  const updatedUser = await userService.updateUser(req.user!.userId, { 
    avatarUrl: secureUrl, 
    avatarPublicId: publicId 
  });

  sendResponse(res, { statusCode: 200, success: true, message: 'Avatar accurately updated robustly internally modified correctly', data: updatedUser });
});
