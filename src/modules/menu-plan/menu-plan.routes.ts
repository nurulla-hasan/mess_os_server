import { Router } from 'express';
import { authorize } from '../../shared/middlewares/authorize';
import { validateRequest } from '../../shared/middlewares/validateRequest';
import * as ctl from './menu-plan.controller';
import * as val from './menu-plan.validation';
import { MESS_ROLES } from '../../constants/roles';

const router = Router({ mergeParams: true });

router.get('/', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), validateRequest(val.listMenuPlansSchema), ctl.getMenuPlans);

router.post('/', authorize(MESS_ROLES.MANAGER), validateRequest(val.createMenuPlanSchema), ctl.createMenuPlan);

router.patch('/:planId', authorize(MESS_ROLES.MANAGER), validateRequest(val.updateMenuPlanSchema), ctl.updateMenuPlan);

router.patch('/:planId/status', authorize(MESS_ROLES.MANAGER), validateRequest(val.updateMenuPlanStatusSchema), ctl.updateMenuPlanStatus);

export const menuPlanRoutes = router;
