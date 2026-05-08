import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/apiError';
import { MessMember } from '../../modules/mess-member/mess-member.model';
import { Mess } from '../../modules/mess/mess.model';

export const messContext = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = String(req.params.messId);
    if (!messId) return next(new AppError(400, 'messId is missing'));

    const mess = await Mess.findById(messId).select('status suspensionNote');
    if (!mess) return next(new AppError(404, 'Mess not found'));

    // Allow super_admin to bypass membership check
    if (req.user?.globalRole === 'super_admin') {
      req.messId = messId;
      return next();
    }

    if (mess.status === 'suspended') {
      const reason = mess.suspensionNote ? ` Reason: ${mess.suspensionNote}` : '';
      return next(new AppError(403, `This mess has been suspended by platform admin.${reason}`));
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
