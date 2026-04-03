import { Router } from 'express';
import { authorize } from '../../shared/middlewares/authorize';
import * as ctl from './report.controller';
import { MESS_ROLES } from '../../constants/roles';

const router = Router({ mergeParams: true });

router.get('/summary', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), ctl.getMessSummary);
router.get('/financial', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), ctl.getMonthlyFinancials);
router.get('/members/:memberId', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), ctl.getMemberStatement);
router.get('/expenses', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), ctl.getExpenseReport);
router.get('/payments', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), ctl.getPaymentReport);
router.get('/export/csv', authorize(MESS_ROLES.MANAGER), ctl.exportCsvReport);
router.get('/export/pdf', authorize(MESS_ROLES.MANAGER), ctl.exportPdfReport);

export const reportRoutes = router;
