"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.messRoutes = void 0;
const express_1 = require("express");
const authenticate_1 = require("../../shared/middlewares/authenticate");
const messContext_1 = require("../../shared/middlewares/messContext");
const authorize_1 = require("../../shared/middlewares/authorize");
const validateRequest_1 = require("../../shared/middlewares/validateRequest");
const messVal = __importStar(require("./mess.validation"));
const messCtl = __importStar(require("./mess.controller"));
const memberVal = __importStar(require("../mess-member/mess-member.validation"));
const mess_member_controller_1 = require("../mess-member/mess-member.controller");
const mess_member_routes_1 = require("../mess-member/mess-member.routes");
const payment_routes_1 = require("../payment/payment.routes");
const expense_routes_1 = require("../expense/expense.routes");
const billing_routes_1 = require("../billing/billing.routes");
const meal_routes_1 = require("../meal/meal.routes");
const meal_off_request_routes_1 = require("../meal-off-request/meal-off-request.routes");
const utility_bill_routes_1 = require("../utility-bill/utility-bill.routes");
const market_schedule_routes_1 = require("../market-schedule/market-schedule.routes");
const menu_plan_routes_1 = require("../menu-plan/menu-plan.routes");
const ai_shopping_routes_1 = require("../ai-shopping/ai-shopping.routes");
const notice_routes_1 = require("../notice/notice.routes");
const complaint_routes_1 = require("../complaint/complaint.routes");
const report_routes_1 = require("../report/report.routes");
const subscription_routes_1 = require("../subscription/subscription.routes");
const roles_1 = require("../../constants/roles");
const router = (0, express_1.Router)({ mergeParams: true });
router.use(authenticate_1.authenticate);
router.post('/join', (0, validateRequest_1.validateRequest)(memberVal.requestJoinSchema), mess_member_controller_1.requestJoin);
router.post('/', (0, validateRequest_1.validateRequest)(messVal.createMessSchema), messCtl.createMess);
router.use('/:messId', messContext_1.messContext);
router.get('/:messId', (0, authorize_1.authorize)(roles_1.MESS_ROLES.MANAGER, roles_1.MESS_ROLES.MEMBER), messCtl.getMess);
router.patch('/:messId', (0, authorize_1.authorize)(roles_1.MESS_ROLES.MANAGER), (0, validateRequest_1.validateRequest)(messVal.updateMessSchema), messCtl.updateMess);
router.post('/:messId/regenerate-invite-code', (0, authorize_1.authorize)(roles_1.MESS_ROLES.MANAGER), messCtl.regenerateInviteCode);
router.post('/:messId/transfer-ownership', (0, authorize_1.authorize)(roles_1.MESS_ROLES.MANAGER), (0, validateRequest_1.validateRequest)(messVal.transferOwnershipSchema), messCtl.transferOwnership);
router.use('/:messId/members', mess_member_routes_1.messMemberRoutes);
router.use('/:messId/payments', payment_routes_1.paymentRoutes);
router.use('/:messId/expenses', expense_routes_1.expenseRoutes);
router.use('/:messId/billing', billing_routes_1.billingRoutes);
router.use('/:messId/meals', meal_routes_1.mealRoutes);
router.use('/:messId/meal-off-requests', meal_off_request_routes_1.mealOffRequestRoutes);
router.use('/:messId/utility-bills', utility_bill_routes_1.utilityBillRoutes);
router.use('/:messId/market-schedules', market_schedule_routes_1.marketScheduleRoutes);
router.use('/:messId/menu-plans', menu_plan_routes_1.menuPlanRoutes);
router.use('/:messId/ai-shopping', ai_shopping_routes_1.aiShoppingRoutes);
router.use('/:messId/notices', notice_routes_1.noticeRoutes);
router.use('/:messId/complaints', complaint_routes_1.complaintRoutes);
router.use('/:messId/reports', report_routes_1.reportRoutes);
router.use('/:messId/subscriptions', subscription_routes_1.messSubscriptionRoutes);
exports.messRoutes = router;
