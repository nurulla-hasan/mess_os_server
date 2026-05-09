import { Router } from 'express';
import { authorize } from '../../shared/middlewares/authorize';
import { validateRequest } from '../../shared/middlewares/validateRequest';
import * as ctl from './meal.controller';
import * as val from './meal.validation';
import { MESS_ROLES } from '../../constants/roles';

const router = Router({ mergeParams: true });

router.get('/', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), validateRequest(val.listMealsSchema), ctl.listMeals);
router.post('/', authorize(MESS_ROLES.MANAGER), validateRequest(val.logMealSchema), ctl.logMeal);
router.post('/bulk', authorize(MESS_ROLES.MANAGER), validateRequest(val.bulkLogMealsSchema), ctl.bulkLogMeals);

export const mealRoutes = router;
