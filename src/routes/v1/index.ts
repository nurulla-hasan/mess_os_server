import { Router } from 'express';
import { adminRoutes } from '../../modules/admin/admin.routes';
import { globalSubscriptionRoutes } from '../../modules/subscription/subscription.routes';

const router = Router();
router.use('/admin', adminRoutes);
router.use('/subscriptions', globalSubscriptionRoutes);

export const v1Routes = router;
