import { Request, Response } from 'express';
import { catchAsync } from '../../shared/utils/asyncHandler';
import { sendResponse } from '../../shared/utils/apiResponse';
import * as expenseService from './expense.service';

export const createExpense = catchAsync(async (req: Request, res: Response) => {
  const result = await expenseService.createExpense(req.messId!, req.body);
  sendResponse(res, { statusCode: 201, success: true, message: 'Expense submitted', data: result });
});

export const getExpenses = catchAsync(async (req: Request, res: Response) => {
  const result = await expenseService.getExpenses(req.messId!);
  sendResponse(res, { statusCode: 200, success: true, message: 'Expenses retrieved', data: result });
});

export const approveExpense = catchAsync(async (req: Request, res: Response) => {
  const result = await expenseService.approveExpense(req.messId!, String(req.params.expenseId), req.user!.userId);
  sendResponse(res, { statusCode: 200, success: true, message: 'Expense approved', data: result });
});

export const reimburseExpense = catchAsync(async (req: Request, res: Response) => {
  const result = await expenseService.reimburseExpense(req.messId!, String(req.params.expenseId), req.user!.userId);
  sendResponse(res, { statusCode: 200, success: true, message: 'Expense reimbursed', data: result });
});
