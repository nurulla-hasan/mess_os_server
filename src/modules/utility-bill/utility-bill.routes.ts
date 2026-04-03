import { Router } from 'express';
import { authorize } from '../../shared/middlewares/authorize';
import { validateRequest } from '../../shared/middlewares/validateRequest';
import * as ctl from './utility-bill.controller';
import * as val from './utility-bill.validation';
import { MESS_ROLES } from '../../constants/roles';

const router = Router({ mergeParams: true });

router.get('/', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), ctl.getUtilityBills);
router.post('/', authorize(MESS_ROLES.MANAGER), validateRequest(val.createUtilityBillSchema), ctl.createUtilityBill);
router.post('/:billId/pay', authorize(MESS_ROLES.MANAGER), ctl.markPaid);

export const utilityBillRoutes = router;
