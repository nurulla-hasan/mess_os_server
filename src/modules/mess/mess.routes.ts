import { Router } from 'express';
import { authenticate } from '../../shared/middlewares/authenticate';
import { messContext } from '../../shared/middlewares/messContext';
import { authorize } from '../../shared/middlewares/authorize';
import { validateRequest } from '../../shared/middlewares/validateRequest';
import { requireSubscriptionFeature } from '../../shared/middlewares/requireSubscriptionFeature';
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
import { MESS_ROLES, GLOBAL_ROLES } from '../../constants/roles';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post('/join', validateRequest(memberVal.requestJoinSchema), requestJoin);

router.post('/', authorize(GLOBAL_ROLES.MANAGER, GLOBAL_ROLES.SUPER_ADMIN), validateRequest(messVal.createMessSchema), messCtl.createMess);

router.use('/:messId', messContext);
router.get('/:messId', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), messCtl.getMess);
router.get('/:messId/dashboard', authorize(MESS_ROLES.MANAGER), messCtl.getDashboard);
router.get('/:messId/member-dashboard', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), messCtl.getMemberDashboard);
router.patch('/:messId', authorize(MESS_ROLES.MANAGER), validateRequest(messVal.updateMessSchema), messCtl.updateMess);
router.post('/:messId/regenerate-invite-code', authorize(MESS_ROLES.MANAGER), messCtl.regenerateInviteCode);
router.post('/:messId/transfer-ownership', authorize(MESS_ROLES.MANAGER), validateRequest(messVal.transferOwnershipSchema), messCtl.transferOwnership);
router.get('/:messId/estimated-rate', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), messCtl.getEstimatedRate);

router.use('/:messId/members', messMemberRoutes);
router.use('/:messId/payments', requireSubscriptionFeature('expenses'), paymentRoutes);
router.use('/:messId/expenses', requireSubscriptionFeature('expenses'), expenseRoutes);
router.use('/:messId/billing', requireSubscriptionFeature('billing'), billingRoutes);
router.use('/:messId/meals', requireSubscriptionFeature('meals'), mealRoutes);
router.use('/:messId/meal-off-requests', requireSubscriptionFeature('meals'), mealOffRequestRoutes);
router.use('/:messId/utility-bills', requireSubscriptionFeature('billing'), utilityBillRoutes);
router.use('/:messId/market-schedules', requireSubscriptionFeature('marketSchedule'), marketScheduleRoutes);
router.use('/:messId/menu-plans', requireSubscriptionFeature('meals'), menuPlanRoutes);
router.use('/:messId/ai-shopping', requireSubscriptionFeature('aiShopping'), aiShoppingRoutes);
router.use('/:messId/notices', requireSubscriptionFeature('notices'), noticeRoutes);
router.use('/:messId/complaints', requireSubscriptionFeature('complaints'), complaintRoutes);
router.use('/:messId/reports', requireSubscriptionFeature('reports'), reportRoutes);
router.use('/:messId/subscriptions', messSubscriptionRoutes);

export const messRoutes = router;
