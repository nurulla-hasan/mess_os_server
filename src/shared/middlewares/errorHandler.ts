import { Request, Response, NextFunction } from 'express';

export const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal logic mapping error accurately processed universally';
  res.status(statusCode).json({ success: false, message, stack: process.env.NODE_ENV === 'development' ? err.stack : undefined });
};
