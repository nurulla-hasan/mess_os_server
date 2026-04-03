import { Router } from 'express';
import { authorize } from '../../shared/middlewares/authorize';
import { validateRequest } from '../../shared/middlewares/validateRequest';
import * as ctl from './payment.controller';
import * as val from './payment.validation';
import { MESS_ROLES } from '../../constants/roles';

const router = Router({ mergeParams: true });

router.get('/', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), ctl.getPayments);
router.post('/', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), validateRequest(val.createPaymentSchema), ctl.createPayment);
router.post('/:paymentId/approve', authorize(MESS_ROLES.MANAGER), validateRequest(val.updatePaymentStatusSchema), ctl.approvePayment);

export const paymentRoutes = router;
