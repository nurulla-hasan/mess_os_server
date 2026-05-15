import { Router } from 'express';
import { authorize } from '../../shared/middlewares/authorize';
import { validateRequest } from '../../shared/middlewares/validateRequest';
import * as ctl from './subscription.controller';
import * as val from './subscription.validation';
import { MESS_ROLES } from '../../constants/roles';

export const globalSubscriptionRoutes = Router();
globalSubscriptionRoutes.get('/plans', ctl.getAvailablePlans);
globalSubscriptionRoutes.post('/sslcommerz/success', ctl.sslCommerzSuccess);
globalSubscriptionRoutes.post('/sslcommerz/fail', ctl.sslCommerzFail);
globalSubscriptionRoutes.post('/sslcommerz/cancel', ctl.sslCommerzCancel);
globalSubscriptionRoutes.post('/sslcommerz/ipn', ctl.sslCommerzIpn);
globalSubscriptionRoutes.get('/sslcommerz/success', ctl.sslCommerzSuccess);
globalSubscriptionRoutes.get('/sslcommerz/fail', ctl.sslCommerzFail);
globalSubscriptionRoutes.get('/sslcommerz/cancel', ctl.sslCommerzCancel);

export const messSubscriptionRoutes = Router({ mergeParams: true });
messSubscriptionRoutes.get('/current', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), ctl.getCurrentPlan);
messSubscriptionRoutes.get('/history', authorize(MESS_ROLES.MANAGER), ctl.getHistory);
messSubscriptionRoutes.post('/trial', authorize(MESS_ROLES.MANAGER), ctl.startTrial);
messSubscriptionRoutes.post('/subscribe', authorize(MESS_ROLES.MANAGER), validateRequest(val.subscribeSchema), ctl.subscribePlan);
messSubscriptionRoutes.post('/cancel', authorize(MESS_ROLES.MANAGER), ctl.cancelSubscription);
