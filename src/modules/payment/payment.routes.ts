import { Router } from 'express';
import { authorize } from '../../shared/middlewares/authorize';
import { validateRequest } from '../../shared/middlewares/validateRequest';
import * as ctl from './payment.controller';
import * as val from './payment.validation';
import { MESS_ROLES } from '../../constants/roles';

const router = Router({ mergeParams: true });

router.get('/', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), validateRequest(val.listPaymentsSchema), ctl.getPayments);
router.post('/', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), validateRequest(val.createPaymentSchema), ctl.createPayment);

router.get('/:paymentId', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), validateRequest(val.paymentIdParamSchema), ctl.getPaymentById);
router.patch('/:paymentId/status', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), validateRequest(val.updatePaymentStatusSchema), ctl.updatePaymentStatus);

export const paymentRoutes = router;
