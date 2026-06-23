import { Request, Response } from 'express';
import { catchAsync } from '../../shared/utils/asyncHandler';
import { sendResponse } from '../../shared/utils/apiResponse';
import * as userService from './user.service';
import { uploadToCloudinary, deleteFromCloudinary } from '../../shared/services/cloudinaryUpload';
import { logger } from '../../shared/utils/logger';

export const getMe = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'User fetched successfully', data: await userService.getUser(req.user!.userId) });
});

export const updateMe = catchAsync(async (req: Request, res: Response) => {
  await userService.updateUser(req.user!.userId, req.body);
  const user = await userService.getUser(req.user!.userId);
  sendResponse(res, { statusCode: 200, success: true, message: 'Profile updated successfully', data: user });
});

export const updateAvatar = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) {
    sendResponse(res, { statusCode: 400, success: false, message: 'No avatar file provided', data: null });
    return;
  }

  const user = await userService.getUserPrivateFields(req.user!.userId);
  
  const { secureUrl, publicId } = await uploadToCloudinary(req.file.buffer, 'avatars');
  
  if (user.avatarPublicId) {
    try {
      await deleteFromCloudinary(user.avatarPublicId);
    } catch (err) {
      logger.warn('Failed to delete old avatar from Cloudinary', { publicId: user.avatarPublicId, error: err });
    }
  }
  
  const updatedUser = await userService.updateUser(req.user!.userId, { 
    avatarUrl: secureUrl, 
    avatarPublicId: publicId 
  });

  sendResponse(res, { statusCode: 200, success: true, message: 'Avatar updated successfully', data: updatedUser });
});

export const switchMess = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Mess context selected successfully',
    data: await userService.switchMess(req.user!.userId, req.body),
  });
});
