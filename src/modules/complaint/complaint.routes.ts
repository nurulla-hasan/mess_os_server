import { Router } from 'express';
import { authorize } from '../../shared/middlewares/authorize';
import { validateRequest } from '../../shared/middlewares/validateRequest';
import * as ctl from './complaint.controller';
import * as val from './complaint.validation';
import { MESS_ROLES } from '../../constants/roles';

const router = Router({ mergeParams: true });

router.get('/', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), ctl.getComplaints);
router.get('/my', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), ctl.getMyComplaints);
router.get('/:complaintId', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), ctl.getComplaintById);

router.post('/', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), validateRequest(val.createComplaintSchema), ctl.createComplaint);

router.patch('/:complaintId/status', authorize(MESS_ROLES.MANAGER), validateRequest(val.updateStatusSchema), ctl.updateStatus);

router.post('/:complaintId/resolve', authorize(MESS_ROLES.MANAGER), validateRequest(val.resolveComplaintSchema), ctl.resolveComplaint);
router.post('/:complaintId/reject', authorize(MESS_ROLES.MANAGER), validateRequest(val.resolveComplaintSchema), ctl.rejectComplaint);

export const complaintRoutes = router;
