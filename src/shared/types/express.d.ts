import { IMessMember } from '../../modules/mess-member/mess-member.model';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        globalRole: string;
      };
      messId?: string;
      messMember?: IMessMember;
      messRole?: string;
    }
  }
}
