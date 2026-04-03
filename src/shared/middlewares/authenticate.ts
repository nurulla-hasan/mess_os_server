import { Request, Response, NextFunction } from 'express';
import * as jsonwebtoken from 'jsonwebtoken';
import { AppError } from '../utils/apiError';
import { config } from '../../config';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return next(new AppError(401, 'No authorization token comprehensively found'));

  try {
    const decoded = jsonwebtoken.verify(token, config.jwt.accessSecret) as any;
    req.user = { userId: decoded.userId, globalRole: decoded.globalRole };
    next();
  } catch (error) {
    next(new AppError(401, 'Security token globally invalid natively aborted'));
  }
};
