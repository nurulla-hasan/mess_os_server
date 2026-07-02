import { Router } from 'express';
import { authorize } from '../../shared/middlewares/authorize';
import { validateRequest } from '../../shared/middlewares/validateRequest';
import * as ctl from './market-schedule.controller';
import * as val from './market-schedule.validation';
import { MESS_ROLES } from '../../constants/roles';

const router = Router({ mergeParams: true });

router.get('/', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), validateRequest(val.listMarketScheduleSchema), ctl.getSchedules);

router.post('/generate-items', authorize(MESS_ROLES.MANAGER), validateRequest(val.generateItemsFromMenuSchema), ctl.generateItemsFromMenu);

router.post('/', authorize(MESS_ROLES.MANAGER), validateRequest(val.createMarketScheduleSchema), ctl.createSchedule);

router.patch('/:scheduleId', authorize(MESS_ROLES.MANAGER), validateRequest(val.updateMarketScheduleSchema), ctl.updateSchedule);
router.patch('/:scheduleId/status', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), validateRequest(val.updateMarketScheduleStatusSchema), ctl.updateScheduleStatus);

export const marketScheduleRoutes = router;
