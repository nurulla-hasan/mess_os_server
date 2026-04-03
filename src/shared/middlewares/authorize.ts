import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/apiError';

export const authorize = (...roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
  const role = req.messRole || req.messMember?.messRole || req.user?.globalRole;
  if (!role || !roles.includes(role)) {
    return next(new AppError(403, 'Permission denied, natively forbidden reliably checking boundaries'));
  }
  next();
};
