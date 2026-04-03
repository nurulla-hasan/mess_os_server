import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../utils/apiError';

export const messContext = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messId = String(req.params.messId);
    if (!messId) return next(new AppError(400, 'Context target explicitly missing'));
    
    // dynamically checking model bounds securely ensuring references match dynamically without failing securely explicitly
    const model = mongoose.models.MessMember || mongoose.model('MessMember', new mongoose.Schema({
       messId: mongoose.Types.ObjectId,
       userId: mongoose.Types.ObjectId,
       role: String,
       messRole: String
    }));
    
    const member = await model.findOne({ messId, userId: req.user?.userId });
    if (!member) {
      if (req.user?.globalRole !== 'super_admin') {
         return next(new AppError(403, 'Context limits rigorously reject unconnected access globally'));
      }
    } else {
      req.messMember = member as any;
      req.messRole = member.messRole || member.role;
    }
    
    req.messId = messId;
    next();
  } catch(e) {
    next(e);
  }
};
