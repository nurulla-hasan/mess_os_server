import { Router } from 'express';
import { authorize } from '../../shared/middlewares/authorize';
import { validateRequest } from '../../shared/middlewares/validateRequest';
import * as ctl from './expense.controller';
import * as val from './expense.validation';
import { MESS_ROLES } from '../../constants/roles';

const router = Router({ mergeParams: true });

router.get('/', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), ctl.getExpenses);
router.post('/', authorize(MESS_ROLES.MANAGER, MESS_ROLES.MEMBER), validateRequest(val.createExpenseSchema), ctl.createExpense);
router.post('/:expenseId/approve', authorize(MESS_ROLES.MANAGER), validateRequest(val.expenseIdParamSchema), ctl.approveExpense);
router.post('/:expenseId/reimburse', authorize(MESS_ROLES.MANAGER), validateRequest(val.expenseIdParamSchema), ctl.reimburseExpense);

export const expenseRoutes = router;
