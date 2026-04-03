import { Request, Response } from 'express';
import { catchAsync } from '../../shared/utils/asyncHandler';
import { sendResponse } from '../../shared/utils/apiResponse';
import * as authService from './auth.service';
import { config } from '../../config';
import { authLogger } from '../../shared/utils/logger';

const REFRESH_COOKIE_NAME = 'refreshToken';

export const register = catchAsync(async (req: Request, res: Response) => {
  const user = await authService.registerUser(req.body);
  sendResponse(res, { statusCode: 201, success: true, message: 'User registered. Please check email for OTP.', data: user });
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const { user, accessToken, refreshToken } = await authService.loginUser(req.body);
  
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: config.env === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 
  });

  sendResponse(res, { statusCode: 200, success: true, message: 'Login successful', data: { user, accessToken } });
});

export const verifyEmail = catchAsync(async (req: Request, res: Response) => {
    const user = await authService.verifyEmail(req.body.email, req.body.otp);
    sendResponse(res, { statusCode: 200, success: true, message: 'Email verified successfully', data: user });
});

export const resendOtp = catchAsync(async (req: Request, res: Response) => {
    await authService.resendOtp(req.body.email);
    sendResponse(res, { statusCode: 200, success: true, message: 'New OTP sent correctly' });
});

export const refreshToken = catchAsync(async (req: Request, res: Response) => {
    const token = req.cookies[REFRESH_COOKIE_NAME];
    if (!token) {
        return sendResponse(res, { statusCode: 401, success: false, message: 'No refresh token provided' });
    }
    const { accessToken, refreshToken: newRefreshToken } = await authService.refreshToken(token);
    
    // Rotation: Update cookie
    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, {
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: config.env === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 
    });

    sendResponse(res, { statusCode: 200, success: true, message: 'Token rotated', data: { accessToken } });
});

export const logout = catchAsync(async (req: Request, res: Response) => {
    if (req.user) {
        await authService.logout(req.user.userId);
    }
    res.clearCookie(REFRESH_COOKIE_NAME);
    sendResponse(res, { statusCode: 200, success: true, message: 'Logout successful' });
});

export const forgotPassword = catchAsync(async (req: Request, res: Response) => {
    await authService.forgotPassword(req.body.email);
    sendResponse(res, { statusCode: 200, success: true, message: 'Password reset OTP sent natively' });
});

export const verifyResetOtp = catchAsync(async (req: Request, res: Response) => {
    await authService.verifyResetOtp(req.body.email, req.body.otp);
    sendResponse(res, { statusCode: 200, success: true, message: 'Reset OTP verified. You may proceed to reset password.' });
});

export const resetPassword = catchAsync(async (req: Request, res: Response) => {
    await authService.resetPassword(req.body);
    sendResponse(res, { statusCode: 200, success: true, message: 'Password reset successfully' });
});

export const changePassword = catchAsync(async (req: Request, res: Response) => {
    await authService.changePassword(req.user!.userId, req.body.oldPassword, req.body.newPassword);
    sendResponse(res, { statusCode: 200, success: true, message: 'Password updated successfully' });
});
