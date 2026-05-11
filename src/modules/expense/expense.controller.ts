import { Request, Response } from 'express';
import { catchAsync } from '../../shared/utils/asyncHandler';
import { sendResponse } from '../../shared/utils/apiResponse';
import { AppError } from '../../shared/utils/apiError';
import * as expenseService from './expense.service';

export const createExpense = catchAsync(async (req: Request, res: Response) => {
  const messId = req.messId!;
  const body = req.body;
  const actor = req.messMember!;

  const actorMemberId = actor._id.toString();

  if (body.paidBy && body.paidBy !== actorMemberId) {
    if (actor.messRole !== 'manager') {
      throw new AppError(403, 'Unauthorized to submit expenses for other members directly');
    }
  } else {
    body.paidBy = actorMemberId;
  }

  const result = await expenseService.createExpense(messId, body);
  sendResponse(res, { statusCode: 201, success: true, message: 'Expense record created successfully', data: result });
});

export const getExpenses = catchAsync(async (req: Request, res: Response) => {
  const result = await expenseService.getExpenses(req.messId!, req.query);
  sendResponse(res, { statusCode: 200, success: true, message: 'Expenses fetched successfully', meta: result.meta, data: result.data });
});

export const getExpenseById = catchAsync(async (req: Request, res: Response) => {
  const result = await expenseService.getExpenseById(req.messId!, String(req.params.expenseId));
  
  // Safety check: Manager or Owner only
  const actor = req.messMember!;
  if (actor.messRole !== 'manager' && result.paidBy.toString() !== actor._id.toString()) {
     throw new AppError(403, 'Unauthorized to view this specific expense record');
  }

  sendResponse(res, { statusCode: 200, success: true, message: 'Expense record fetched successfully', data: result });
});

export const updateExpenseStatus = catchAsync(async (req: Request, res: Response) => {
  const actor = req.messMember!;
  const result = await expenseService.updateExpenseStatus(
    req.messId!,
    String(req.params.expenseId),
    req.body.status,
    req.user!.userId,
    actor._id.toString(),
    actor.messRole
  );
  const messages: Record<string, string> = {
    approved: 'Expense approved and ledgered correctly',
    rejected: 'Expense record rejected by manager',
    canceled: 'Pending expense record canceled successfully',
  };
  sendResponse(res, { statusCode: 200, success: true, message: messages[req.body.status], data: result });
});

export const reimburseExpense = catchAsync(async (req: Request, res: Response) => {
  const result = await expenseService.reimburseExpense(req.messId!, String(req.params.expenseId), req.user!.userId);
  sendResponse(res, { statusCode: 200, success: true, message: 'Personal expense reimbursed from mess cash correctly', data: result });
});

export const cancelExpense = catchAsync(async (req: Request, res: Response) => {
  const actor = req.messMember!;
  const result = await expenseService.cancelExpense(req.messId!, String(req.params.expenseId), actor._id.toString(), actor.messRole);
  sendResponse(res, { statusCode: 200, success: true, message: 'Pending expense record canceled successfully', data: result });
});
