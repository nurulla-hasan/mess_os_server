import { Router } from 'express';
import { authenticate } from '../../shared/middlewares/authenticate';
import { AppError } from '../../shared/utils/apiError';
import { validateRequest } from '../../shared/middlewares/validateRequest';
import * as ctl from './admin.controller';
import * as val from './admin.validation';
import * as managerRequestCtl from '../manager-request/manager-request.controller';
import * as managerRequestVal from '../manager-request/manager-request.validation';

import { Request, Response, NextFunction } from 'express';

export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
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
router.get('/manager-requests', validateRequest(managerRequestVal.listManagerRequestsSchema), managerRequestCtl.listManagerRequests);

router.patch('/users/:userId/role', validateRequest(val.updateRoleSchema), ctl.updateUserRole);
router.patch('/users/:userId/status', validateRequest(val.blockUserSchema), ctl.blockUser);
router.patch('/messes/:messId/suspend', validateRequest(val.suspendMessSchema), ctl.suspendMess);
router.patch('/manager-requests/:requestId/status', validateRequest(managerRequestVal.reviewManagerRequestSchema), managerRequestCtl.reviewManagerRequest);

export const adminRoutes = router;
