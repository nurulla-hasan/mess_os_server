import { Router } from 'express';
import { authorize } from '../../shared/middlewares/authorize';
import { validateRequest } from '../../shared/middlewares/validateRequest';
import * as ctl from './report.controller';
import * as val from './report.validation';
import { MESS_ROLES } from '../../constants/roles';

const router = Router({ mergeParams: true });

router.get('/summary', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), ctl.getMessSummary);
router.get('/financial', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), validateRequest(val.financialReportSchema), ctl.getMonthlyFinancials);
router.get('/members/:memberId', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), validateRequest(val.memberStatementSchema), ctl.getMemberStatement);
router.get('/expenses', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), validateRequest(val.dateRangeReportSchema), ctl.getExpenseReport);
router.get('/payments', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), validateRequest(val.dateRangeReportSchema), ctl.getPaymentReport);
router.get('/export/csv', authorize(MESS_ROLES.MANAGER), validateRequest(val.exportCsvReportSchema), ctl.exportCsvReport);
router.get('/export/pdf', authorize(MESS_ROLES.MANAGER), ctl.exportPdfReport);

export const reportRoutes = router;
