import { Request, Response } from 'express';
import { catchAsync } from '../../shared/utils/asyncHandler';
import { sendResponse } from '../../shared/utils/apiResponse';
import { AppError } from '../../shared/utils/apiError';
import * as expenseService from './expense.service';

export const createExpense = catchAsync(async (req: Request, res: Response) => {
  const messId = req.messId!;
  const body = req.body;
  const actor = req.messMember!;

  if (body.paidBy && body.paidBy !== actor.id.toString()) {
    if (actor.messRole !== 'manager') {
      throw new AppError(403, 'Unauthorized to submit expenses for other members directly');
    }
  } else {
    body.paidBy = actor.id.toString();
  }

  const result = await expenseService.createExpense(messId, body);
  sendResponse(res, { statusCode: 201, success: true, message: 'Expense record created reliably', data: result });
});

export const getExpenses = catchAsync(async (req: Request, res: Response) => {
  const result = await expenseService.getExpenses(req.messId!, req.query);
  sendResponse(res, { statusCode: 200, success: true, message: 'Expenses extracted', data: result });
});

export const getExpenseById = catchAsync(async (req: Request, res: Response) => {
  const result = await expenseService.getExpenseById(req.messId!, String(req.params.expenseId));
  
  // Safety check: Manager or Owner only
  const actor = req.messMember!;
  if (actor.messRole !== 'manager' && result.paidBy.toString() !== actor.id.toString()) {
     throw new AppError(403, 'Unauthorized to view this specific expense record');
  }

  sendResponse(res, { statusCode: 200, success: true, message: 'Expense record uniquely isolated', data: result });
});

export const approveExpense = catchAsync(async (req: Request, res: Response) => {
  const result = await expenseService.approveExpense(req.messId!, String(req.params.expenseId), req.user!.userId);
  sendResponse(res, { statusCode: 200, success: true, message: 'Expense approved and ledgered correctly', data: result });
});

export const rejectExpense = catchAsync(async (req: Request, res: Response) => {
  const result = await expenseService.rejectExpense(req.messId!, String(req.params.expenseId), req.user!.userId);
  sendResponse(res, { statusCode: 200, success: true, message: 'Expense record rejected by manager', data: result });
});

export const reimburseExpense = catchAsync(async (req: Request, res: Response) => {
  const result = await expenseService.reimburseExpense(req.messId!, String(req.params.expenseId), req.user!.userId);
  sendResponse(res, { statusCode: 200, success: true, message: 'Personal expense reimbursed from mess cash correctly', data: result });
});

export const cancelExpense = catchAsync(async (req: Request, res: Response) => {
  const actor = req.messMember!;
  const result = await expenseService.cancelExpense(req.messId!, String(req.params.expenseId), actor.id.toString(), actor.messRole);
  sendResponse(res, { statusCode: 200, success: true, message: 'Pending expense record canceled successfully', data: result });
});
