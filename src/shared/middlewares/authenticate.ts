import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/apiError';
import { config } from '../../config';
import { User } from '../../modules/user/user.model';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return next(new AppError(401, 'Authorization token is required'));

  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret) as any;
    
    // Check if user is still active
    const user = await User.findById(decoded.userId).select('status globalRole');
    if (!user) return next(new AppError(401, 'User not found'));
    if (user.status === 'blocked') {
      // For API requests, return JSON error
      if (req.headers.accept?.includes('application/json') || req.xhr || req.headers['content-type']?.includes('application/json')) {
        return next(new AppError(403, 'Your account has been blocked by administrator'));
      }
      // For browser requests, redirect to blocked page
      return res.redirect('/blocked');
    }
    
    req.user = { userId: decoded.userId, globalRole: user.globalRole };
    next();
  } catch (error) {
    next(new AppError(401, 'Invalid or expired authorization token'));
  }
};

export const authenticateAllowBlocked = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return next(new AppError(401, 'Authorization token is required'));

  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret) as any;
    
    // Check if user exists (but allow blocked users)
    const user = await User.findById(decoded.userId).select('status globalRole');
    if (!user) return next(new AppError(401, 'User not found'));
    
    req.user = { userId: decoded.userId, globalRole: user.globalRole };
    next();
  } catch (error) {
    next(new AppError(401, 'Invalid or expired authorization token'));
  }
};

