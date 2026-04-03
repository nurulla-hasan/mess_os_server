import { Router } from 'express';
import { authRoutes } from '../../modules/auth/auth.routes';
import { userRoutes } from '../../modules/user/user.routes';
import { messRoutes } from '../../modules/mess/mess.routes';
import { adminRoutes } from '../../modules/admin/admin.routes';
import { globalSubscriptionRoutes } from '../../modules/subscription/subscription.routes';

const router = Router();
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/messes', messRoutes);
router.use('/admin', adminRoutes);
router.use('/subscriptions', globalSubscriptionRoutes);

export const v1Routes = router;
