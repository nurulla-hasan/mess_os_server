import { Router } from 'express';
import { authenticate } from '../../shared/middlewares/authenticate';
import { validateRequest } from '../../shared/middlewares/validateRequest';
import { uploadAvatar } from '../../shared/middlewares/uploadAvatar';
import * as val from './user.validation';
import * as ctl from './user.controller';

const router = Router();
router.use(authenticate);
router.get('/me', ctl.getMe);
router.patch('/me', validateRequest(val.updateMeSchema), ctl.updateMe);
router.patch('/me/avatar', uploadAvatar, ctl.updateAvatar);

export const userRoutes = router;
