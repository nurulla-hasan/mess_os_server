import { Router } from 'express';
import { authenticate } from '../../shared/middlewares/authenticate';
import { messContext } from '../../shared/middlewares/messContext';
import { authorize } from '../../shared/middlewares/authorize';
import { validateRequest } from '../../shared/middlewares/validateRequest';
import * as messVal from './mess.validation';
import * as messCtl from './mess.controller';
import * as memberVal from '../mess-member/mess-member.validation';
import { requestJoin } from '../mess-member/mess-member.controller';
import { messMemberRoutes } from '../mess-member/mess-member.routes';
import { paymentRoutes } from '../payment/payment.routes';
import { expenseRoutes } from '../expense/expense.routes';
import { billingRoutes } from '../billing/billing.routes';
import { mealRoutes } from '../meal/meal.routes';
import { mealOffRequestRoutes } from '../meal-off-request/meal-off-request.routes';
import { utilityBillRoutes } from '../utility-bill/utility-bill.routes';
import { marketScheduleRoutes } from '../market-schedule/market-schedule.routes';
import { menuPlanRoutes } from '../menu-plan/menu-plan.routes';
import { aiShoppingRoutes } from '../ai-shopping/ai-shopping.routes';
import { noticeRoutes } from '../notice/notice.routes';
import { complaintRoutes } from '../complaint/complaint.routes';
import { reportRoutes } from '../report/report.routes';
import { messSubscriptionRoutes } from '../subscription/subscription.routes';
import { MESS_ROLES } from '../../constants/roles';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post('/join', validateRequest(memberVal.requestJoinSchema), requestJoin);

router.post('/', validateRequest(messVal.createMessSchema), messCtl.createMess);

router.use('/:messId', messContext);
router.get('/:messId', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), messCtl.getMess);
router.patch('/:messId', authorize(MESS_ROLES.MANAGER), validateRequest(messVal.updateMessSchema), messCtl.updateMess);
router.post('/:messId/regenerate-invite-code', authorize(MESS_ROLES.MANAGER), messCtl.regenerateInviteCode);
router.post('/:messId/transfer-ownership', authorize(MESS_ROLES.MANAGER), validateRequest(messVal.transferOwnershipSchema), messCtl.transferOwnership);

router.use('/:messId/members', messMemberRoutes);
router.use('/:messId/payments', paymentRoutes);
router.use('/:messId/expenses', expenseRoutes);
router.use('/:messId/billing', billingRoutes);
router.use('/:messId/meals', mealRoutes);
router.use('/:messId/meal-off-requests', mealOffRequestRoutes);
router.use('/:messId/utility-bills', utilityBillRoutes);
router.use('/:messId/market-schedules', marketScheduleRoutes);
router.use('/:messId/menu-plans', menuPlanRoutes);
router.use('/:messId/ai-shopping', aiShoppingRoutes);
router.use('/:messId/notices', noticeRoutes);
router.use('/:messId/complaints', complaintRoutes);
router.use('/:messId/reports', reportRoutes);
router.use('/:messId/subscriptions', messSubscriptionRoutes);

export const messRoutes = router;
