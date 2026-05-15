import { Router } from 'express';
import { authorize } from '../../shared/middlewares/authorize';
import { validateRequest } from '../../shared/middlewares/validateRequest';
import * as ctl from './meal-off-request.controller';
import * as val from './meal-off-request.validation';
import { MESS_ROLES } from '../../constants/roles';

const router = Router({ mergeParams: true });

router.get('/', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), validateRequest(val.listMealOffRequestsSchema), ctl.listRequests);
router.post('/', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), validateRequest(val.createMealOffSchema), ctl.createRequest);

router.patch('/:requestId/cancel', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), validateRequest(val.mealOffRequestIdParamSchema), ctl.cancelOwnPendingRequest);
router.patch('/:requestId/status', authorize(MESS_ROLES.MANAGER), validateRequest(val.reviewMealOffRequestSchema), ctl.reviewRequest);

export const mealOffRequestRoutes = router;
