import { Router } from 'express';
import { authenticate } from '../../shared/middlewares/authenticate';
import { AppError } from '../../shared/utils/apiError';
import { validateRequest } from '../../shared/middlewares/validateRequest';
import * as ctl from './admin.controller';
import * as val from './admin.validation';

export const requireSuperAdmin = (req: any, res: any, next: any) => {
  if (req.user?.globalRole !== 'super_admin') {
    return next(new AppError(403, 'Restricted strictly to platform super administrators'));
  }
  next();
};

const router = Router();

router.use(authenticate, requireSuperAdmin);

router.get('/users', validateRequest(val.paginationSchema), ctl.getAllUsers);
router.get('/messes', validateRequest(val.paginationSchema), ctl.getAllMesses);
router.get('/stats', ctl.getStats);

router.patch('/users/:userId/role', validateRequest(val.updateRoleSchema), ctl.updateUserRole);
router.patch('/users/:userId/block', validateRequest(val.blockUserSchema), ctl.blockUser);
router.patch('/messes/:messId/suspend', validateRequest(val.suspendMessSchema), ctl.suspendMess);

export const adminRoutes = router;
