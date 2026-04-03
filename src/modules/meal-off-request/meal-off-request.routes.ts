import { Router } from 'express';
import { authorize } from '../../shared/middlewares/authorize';
import { validateRequest } from '../../shared/middlewares/validateRequest';
import * as ctl from './meal-off-request.controller';
import * as val from './meal-off-request.validation';
import { MESS_ROLES } from '../../constants/roles';

const router = Router({ mergeParams: true });

router.get('/', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), ctl.listRequests);
router.post('/', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), validateRequest(val.createMealOffSchema), ctl.createRequest);

router.post('/:requestId/approve', authorize(MESS_ROLES.MANAGER), ctl.approveRequest);
router.post('/:requestId/reject', authorize(MESS_ROLES.MANAGER), ctl.rejectRequest);

export const mealOffRequestRoutes = router;
