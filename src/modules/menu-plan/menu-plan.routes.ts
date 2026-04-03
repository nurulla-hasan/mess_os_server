import { Router } from 'express';
import { authorize } from '../../shared/middlewares/authorize';
import { validateRequest } from '../../shared/middlewares/validateRequest';
import * as ctl from './menu-plan.controller';
import * as val from './menu-plan.validation';
import { MESS_ROLES } from '../../constants/roles';

const router = Router({ mergeParams: true });

router.get('/', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), ctl.getMenuPlans);
router.get('/date/:date', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), validateRequest(val.dateParamSchema), ctl.getMenuPlanByDate);
router.get('/:planId', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), ctl.getMenuPlanById);

router.post('/', authorize(MESS_ROLES.MANAGER), validateRequest(val.createMenuPlanSchema), ctl.createMenuPlan);

router.patch('/:planId', authorize(MESS_ROLES.MANAGER), validateRequest(val.updateMenuPlanSchema), ctl.updateMenuPlan);

router.post('/:planId/publish', authorize(MESS_ROLES.MANAGER), ctl.publishMenuPlan);
router.post('/:planId/archive', authorize(MESS_ROLES.MANAGER), ctl.archiveMenuPlan);

export const menuPlanRoutes = router;
