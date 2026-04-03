import { Router } from 'express';
import { authorize } from '../../shared/middlewares/authorize';
import { validateRequest } from '../../shared/middlewares/validateRequest';
import * as ctl from './payment.controller';
import * as val from './payment.validation';
import { MESS_ROLES } from '../../constants/roles';

const router = Router({ mergeParams: true });

router.get('/', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), ctl.getPayments);
router.post('/', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), validateRequest(val.createPaymentSchema), ctl.createPayment);

router.get('/me', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), ctl.getMyPayments);

router.get('/:paymentId', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), ctl.getPaymentById);
router.post('/:paymentId/approve', authorize(MESS_ROLES.MANAGER), ctl.approvePayment);
router.post('/:paymentId/reject', authorize(MESS_ROLES.MANAGER), ctl.rejectPayment);
router.post('/:paymentId/cancel', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), ctl.cancelPayment);

export const paymentRoutes = router;
