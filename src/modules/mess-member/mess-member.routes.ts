import { Router } from 'express';
import * as ctl from './mess-member.controller';

// Note: These routes are mounted under /messes/:messId/members
// Parent router (mess.routes.ts) applies authenticate + messContext middleware
// Authorization checks are handled in the controller based on messRole

const router = Router({ mergeParams: true });

router.get('/', ctl.getMembers);
router.post('/:memberId/approve', ctl.approveMember);
router.post('/:memberId/reject', ctl.rejectMember);
router.post('/:memberId/remove', ctl.removeMember);

export const messMemberRoutes = router;
