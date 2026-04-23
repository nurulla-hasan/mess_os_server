import { Router } from 'express';
import { authorize } from '../../shared/middlewares/authorize';
import { MESS_ROLES } from '../../constants/roles';
import * as ctl from './mess-member.controller';

// Note: These routes are mounted under /messes/:messId/members
// Parent router (mess.routes.ts) applies authenticate + messContext middleware

const router = Router({ mergeParams: true });

// Any active member (including manager) can view the active member list
router.get('/', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), ctl.getMembers);

// Only manager can view pending join requests
router.get('/pending', authorize(MESS_ROLES.MANAGER), ctl.getPendingRequests);

// Only manager can approve, reject, or remove members
router.post('/:memberId/approve', authorize(MESS_ROLES.MANAGER), ctl.approveMember);
router.post('/:memberId/reject', authorize(MESS_ROLES.MANAGER), ctl.rejectMember);
router.post('/:memberId/remove', authorize(MESS_ROLES.MANAGER), ctl.removeMember);

export const messMemberRoutes = router;
