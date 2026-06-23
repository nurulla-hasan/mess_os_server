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
router.get('/options', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), ctl.getActiveMemberOptions);
router.get('/', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), validateRequest(val.getMembersSchema), ctl.getMembers);
router.get('/pending-toggle-requests', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), ctl.getPendingToggleRequests);

// Only manager can approve/reject pending requests or remove active members.
router.patch('/:memberId/status', authorize(MESS_ROLES.MANAGER), validateRequest(val.updatePendingMemberStatusSchema), ctl.updatePendingMemberStatus);
router.patch('/:memberId/participation', authorize(MESS_ROLES.MANAGER), validateRequest(val.updateMemberParticipationSchema), ctl.updateMemberParticipation);
router.post('/:memberId/request-toggle', authorize(MESS_ROLES.MANAGER), ctl.requestResidentToggle);
router.post('/accept-toggle', authorize(MESS_ROLES.MEMBER, MESS_ROLES.MANAGER), validateRequest(val.acceptResidentToggleSchema), ctl.acceptResidentToggle);
router.post('/:memberId/remove', authorize(MESS_ROLES.MANAGER), ctl.removeMember);

export const messMemberRoutes = router;
