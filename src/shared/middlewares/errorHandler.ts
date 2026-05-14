import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  if (err instanceof ZodError || err.name === 'ZodError') {
    const errors = err.issues?.map((issue: any) => {
      const path = issue.path?.join('.') || 'request';
      return `${path}: ${issue.message}`;
    }) || [];
    message = `Invalid input data. ${errors.join('. ')}`;
    statusCode = 400;
  }

  // Handle Mongoose CastError (Invalid ObjectId)
  if (err.name === 'CastError') {
    message = `Invalid ${err.path}: ${err.value}`;
    statusCode = 400;
  }

  // Handle Mongoose Duplicate Key Error
  if (err.code === 11000) {
    if (err.keyPattern?.messId && err.keyPattern?.userId) {
      message = 'This user already has a membership record in this mess';
    } else {
      const value = err.errmsg ? err.errmsg.match(/(["'])(\\?.)*?\1/)?.[0] : 'Duplicate field value';
      message = `Duplicate field value: ${value}. Please use another value!`;
    }
    statusCode = 400;
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((el: any) => el.message);
    message = `Invalid input data. ${errors.join('. ')}`;
    statusCode = 400;
  }

  // Handle JWT Errors
  if (err.name === 'JsonWebTokenError') {
    message = 'Invalid token. Please log in again!';
    statusCode = 401;
  }

  if (err.name === 'TokenExpiredError') {
    message = 'Your token has expired! Please log in again.';
    statusCode = 401;
  }

  res.status(statusCode).json({ 
    success: false, 
    message, 
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack, error: err })
  });
};
