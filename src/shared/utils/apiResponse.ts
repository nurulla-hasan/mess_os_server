import { Response } from 'express';
export const sendResponse = (res: Response, data: { statusCode: number, success: boolean, message: string, data?: any }) => {
  res.status(data.statusCode).json({ success: data.success, message: data.message, data: data.data });
};
