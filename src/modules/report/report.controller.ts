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
  if (!month || !year) throw new AppError(400, 'Month and year query parameters are required');
  sendResponse(res, { statusCode: 200, success: true, message: 'Monthly financials fetched successfully', data: await rptService.getMonthlyFinancials(req.messId!, month, year) });
});

export const getMemberStatement = catchAsync(async (req: Request, res: Response) => {
  const isManager = req.messRole === 'manager';
  const callerMemberId = req.messMember!._id.toString();
  const targetMemberId = String(req.params.memberId);
  
  if (!isManager && targetMemberId !== callerMemberId) {
     throw new AppError(403, 'You do not have permission to view this member statement');
  }

  sendResponse(res, { statusCode: 200, success: true, message: 'Member statement fetched successfully', data: await rptService.getMemberStatement(req.messId!, targetMemberId) });
});

export const getExpenseReport = catchAsync(async (req: Request, res: Response) => {
  const start = req.query.start ? String(req.query.start) : req.query.startDate ? String(req.query.startDate) : undefined;
  const end = req.query.end ? String(req.query.end) : req.query.endDate ? String(req.query.endDate) : undefined;
  sendResponse(res, { statusCode: 200, success: true, message: 'Expenses aggregated successfully', data: await rptService.getExpenseReport(req.messId!, start, end) });
});

export const getPaymentReport = catchAsync(async (req: Request, res: Response) => {
  const start = req.query.start ? String(req.query.start) : req.query.startDate ? String(req.query.startDate) : undefined;
  const end = req.query.end ? String(req.query.end) : req.query.endDate ? String(req.query.endDate) : undefined;
  sendResponse(res, { statusCode: 200, success: true, message: 'Payments aggregated successfully', data: await rptService.getPaymentReport(req.messId!, start, end) });
});

export const exportCsvReport = catchAsync(async (req: Request, res: Response) => {
  const type = req.query.type === 'payments' ? 'payments' : 'expenses';
  const csvData = await rptService.exportCsvReport(req.messId!, type);
  res.header('Content-Type', 'text/csv');
  res.attachment(`mess-report-${type}-${Date.now()}.csv`);
  res.send(csvData);
});

export const exportPdfReport = catchAsync(async (req: Request, res: Response) => {
  const pdfBuffer = await rptService.exportPdfReport(req.messId!);
  res.header('Content-Type', 'application/pdf');
  res.attachment(`mess-report-${Date.now()}.pdf`);
  res.send(pdfBuffer);
});
