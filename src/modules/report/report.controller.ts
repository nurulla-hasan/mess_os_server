import { Request, Response } from 'express';
import { catchAsync } from '../../shared/utils/asyncHandler';
import { sendResponse } from '../../shared/utils/apiResponse';
import * as rptService from './report.service';
import { AppError } from '../../shared/utils/apiError';

export const getMessSummary = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Summary fetched', data: await rptService.getMessSummary(req.messId!) });
});

export const getMonthlyFinancials = catchAsync(async (req: Request, res: Response) => {
  const month = parseInt(String(req.query.month));
  const year = parseInt(String(req.query.year));
  if (!month || !year) throw new AppError(400, 'Month and year queries strictly required');
  sendResponse(res, { statusCode: 200, success: true, message: 'Financials extracted via finalized tables', data: await rptService.getMonthlyFinancials(req.messId!, month, year) });
});

export const getMemberStatement = catchAsync(async (req: Request, res: Response) => {
  const isManager = req.messMember?.messRole === 'manager' || req.messRole === 'manager';
  const callerMemberId = req.messMember!._id.toString();
  const targetMemberId = String(req.params.memberId);
  
  if (!isManager && targetMemberId !== callerMemberId) {
     throw new AppError(403, 'Permission denied, safe boundaries violated for accessing member statement');
  }

  sendResponse(res, { statusCode: 200, success: true, message: 'Member statements calculated comprehensively', data: await rptService.getMemberStatement(req.messId!, targetMemberId) });
});

export const getExpenseReport = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Expenses aggregated securely', data: await rptService.getExpenseReport(req.messId!, String(req.query.start), String(req.query.end)) });
});

export const getPaymentReport = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Payments aggregated securely', data: await rptService.getPaymentReport(req.messId!, String(req.query.start), String(req.query.end)) });
});

export const exportCsvReport = catchAsync(async (req: Request, res: Response) => {
  const type = req.query.type as 'expenses' | 'payments' || 'expenses';
  const csvData = await rptService.exportCsvReport(req.messId!, type);
  res.header('Content-Type', 'text/csv');
  res.attachment(`mess-report-${type}-${Date.now()}.csv`);
  res.send(csvData);
});

export const exportPdfReport = catchAsync(async (req: Request, res: Response) => {
  await rptService.exportPdfReport(req.messId!);
});
