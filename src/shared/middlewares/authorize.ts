import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/apiError';

export const authorize = (...roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
  // Super admin bypasses all role checks globally
  if (req.user?.globalRole === 'super_admin') return next();

  // For mess-scoped routes, use the mess-level role set by messContext
  const role = req.messRole ?? req.user?.globalRole;
  if (!role || !roles.includes(role)) {
    return next(new AppError(403, 'You do not have permission to perform this action'));
  }
  next();
};
