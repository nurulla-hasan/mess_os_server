import { Request, Response } from 'express';
import { catchAsync } from '../../shared/utils/asyncHandler';
import { sendResponse } from '../../shared/utils/apiResponse';
import * as authService from './auth.service';

export const register = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.registerUser(req.body);
  sendResponse(res, { statusCode: 201, success: true, message: 'Account stably launched natively securely mapped', data: result });
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.loginUser(req.body);
  const { refreshToken, ...rest } = result;
  
  res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
  sendResponse(res, { statusCode: 200, success: true, message: 'Sessions reliably extracted gracefully tracked securely', data: rest });
});
