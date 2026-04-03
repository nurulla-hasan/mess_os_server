import { Router } from 'express';
import { authorize } from '../../shared/middlewares/authorize';
import { validateRequest } from '../../shared/middlewares/validateRequest';
import * as ctl from './billing.controller';
import * as val from './billing.validation';
import { MESS_ROLES } from '../../constants/roles';

const router = Router({ mergeParams: true });

router.get('/', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), ctl.getBillingCycles);
router.get('/:billingCycleId/members', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), ctl.getMemberBills);

router.post('/preview', authorize(MESS_ROLES.MANAGER), validateRequest(val.previewBillingSchema), ctl.previewBilling);
router.post('/finalize', authorize(MESS_ROLES.MANAGER), validateRequest(val.finalizeBillingSchema), ctl.finalizeBilling);
router.post('/:billingCycleId/reopen', authorize(MESS_ROLES.MANAGER), ctl.reopenBilling);

export const billingRoutes = router;
