import { Router } from 'express';
import * as ctl from './mess-member.controller';

const router = Router({ mergeParams: true });
router.get('/', ctl.getMembers);
router.post('/:memberId/approve', ctl.approveMember);
router.post('/:memberId/reject', ctl.rejectMember);
router.post('/:memberId/remove', ctl.removeMember);

export const messMemberRoutes = router;
