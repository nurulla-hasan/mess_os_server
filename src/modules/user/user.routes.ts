import { Router } from 'express';
import { authenticate, authenticateAllowBlocked } from '../../shared/middlewares/authenticate';
import { validateRequest } from '../../shared/middlewares/validateRequest';
import { uploadAvatar } from '../../shared/middlewares/uploadAvatar';
import * as val from './user.validation';
import * as ctl from './user.controller';
import * as managerRequestCtl from '../manager-request/manager-request.controller';
import * as managerRequestVal from '../manager-request/manager-request.validation';

const router = Router();
router.get('/me', authenticateAllowBlocked, ctl.getMe);
router.use(authenticate);
router.patch('/me', validateRequest(val.updateMeSchema), ctl.updateMe);
router.patch('/me/avatar', uploadAvatar, ctl.updateAvatar);
router.post('/me/switch-mess', validateRequest(val.switchMessSchema), ctl.switchMess);
router.get('/me/manager-request', managerRequestCtl.getMyManagerRequest);
router.post('/me/manager-request', validateRequest(managerRequestVal.createManagerRequestSchema), managerRequestCtl.createManagerRequest);

export const userRoutes = router;
