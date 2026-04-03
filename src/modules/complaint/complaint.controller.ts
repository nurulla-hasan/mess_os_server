import { Request, Response } from 'express';
import { catchAsync } from '../../shared/utils/asyncHandler';
import { sendResponse } from '../../shared/utils/apiResponse';
import * as compService from './complaint.service';
import { AppError } from '../../shared/utils/apiError';

export const createComplaint = catchAsync(async (req: Request, res: Response) => {
  if (!req.messMember) throw new AppError(403, 'Context missing mapping bounds');
  sendResponse(res, { statusCode: 201, success: true, message: 'Complaint registered', data: await compService.createComplaint(req.messId!, req.body, req.messMember._id.toString()) });
});

export const getComplaints = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Complaints fully traversed', data: await compService.getComplaints(req.messId!) });
});

export const getMyComplaints = catchAsync(async (req: Request, res: Response) => {
  if (!req.messMember) throw new AppError(403, 'Mapped user required');
  sendResponse(res, { statusCode: 200, success: true, message: 'My complaints pulled', data: await compService.getMyComplaints(req.messId!, req.messMember._id.toString()) });
});

export const getComplaintById = catchAsync(async (req: Request, res: Response) => {
  if (!req.messMember) throw new AppError(403, 'Context missing mapping bounds');
  const isManager = req.messMember.messRole === 'manager' || req.messRole === 'manager';
  sendResponse(res, { statusCode: 200, success: true, message: 'Complaint pulled', data: await compService.getComplaintById(req.messId!, String(req.params.complaintId), req.messMember._id.toString(), isManager) });
});

export const updateStatus = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Status mapped', data: await compService.updateComplaintStatus(req.messId!, String(req.params.complaintId), req.body.status) });
});

export const resolveComplaint = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Complete', data: await compService.resolveComplaint(req.messId!, String(req.params.complaintId), req.body.resolvedNote || '', req.user!.userId) });
});

export const rejectComplaint = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Rejected mapping', data: await compService.rejectComplaint(req.messId!, String(req.params.complaintId), req.body.resolvedNote || '', req.user!.userId) });
});
