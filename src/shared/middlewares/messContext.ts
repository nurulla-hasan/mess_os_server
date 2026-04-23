import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/apiError';
import { MessMember } from '../../modules/mess-member/mess-member.model';

export const messContext = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = String(req.params.messId);
    if (!messId) return next(new AppError(400, 'messId is missing'));

    // Allow super_admin to bypass membership check
    if (req.user?.globalRole === 'super_admin') {
      req.messId = messId;
      return next();
    }

    // Find the user's membership record for this mess
    const member = await MessMember.findOne({ messId, userId: req.user?.userId, status: 'active' });
    if (!member) {
      return next(new AppError(403, 'You are not an active member of this mess'));
    }

    req.messMember = member;
    req.messRole = member.messRole;
    req.messId = messId;
    next();
  } catch (e) {
    next(e);
  }
};
