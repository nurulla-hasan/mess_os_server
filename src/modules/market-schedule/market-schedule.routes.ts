import { Router } from 'express';
import { authorize } from '../../shared/middlewares/authorize';
import { validateRequest } from '../../shared/middlewares/validateRequest';
import * as ctl from './market-schedule.controller';
import * as val from './market-schedule.validation';
import { MESS_ROLES } from '../../constants/roles';

const router = Router({ mergeParams: true });

router.get('/', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), ctl.getSchedules);
router.get('/my-duties', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), ctl.getMyDuties);

router.post('/', authorize(MESS_ROLES.MANAGER), validateRequest(val.createMarketScheduleSchema), ctl.createSchedule);

router.patch('/:scheduleId', authorize(MESS_ROLES.MANAGER), validateRequest(val.updateMarketScheduleSchema), ctl.updateSchedule);
router.post('/:scheduleId/reassign', authorize(MESS_ROLES.MANAGER), validateRequest(val.reassignScheduleSchema), ctl.reassignSchedule);
router.patch('/:scheduleId/spent', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), validateRequest(val.updateActualSpentSchema), ctl.updateActualSpent);

router.post('/:scheduleId/complete', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), validateRequest(val.completeMarketScheduleSchema), ctl.completeSchedule);
router.post('/:scheduleId/void', authorize(MESS_ROLES.MANAGER), ctl.voidSchedule);

export const marketScheduleRoutes = router;
