import { Router } from 'express';
import { authorize } from '../../shared/middlewares/authorize';
import { validateRequest } from '../../shared/middlewares/validateRequest';
import { MESS_ROLES } from '../../constants/roles';
import * as ctl from './mess-member.controller';
import * as val from './mess-member.validation';

// Note: These routes are mounted under /messes/:messId/members
// Parent router (mess.routes.ts) applies authenticate + messContext middleware

const router = Router({ mergeParams: true });

// Any active member can view active members; managers can filter by status.
router.get('/', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), validateRequest(val.getMembersSchema), ctl.getMembers);

// Only manager can approve, reject, or remove members
router.post('/:memberId/approve', authorize(MESS_ROLES.MANAGER), ctl.approveMember);
router.post('/:memberId/reject', authorize(MESS_ROLES.MANAGER), ctl.rejectMember);
router.post('/:memberId/remove', authorize(MESS_ROLES.MANAGER), ctl.removeMember);

export const messMemberRoutes = router;
