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
  if (!req.messMember) throw new AppError(403, 'Mapped user required');
  const isMyScope = req.query.scope === 'my';
  const query = req.messMember.messRole === 'manager' && !isMyScope
    ? req.query
    : { ...req.query, messMemberId: req.messMember._id.toString() };
  const result = await compService.getComplaints(req.messId!, query);
  sendResponse(res, { statusCode: 200, success: true, message: 'Complaints fully traversed', meta: result.meta, data: result.data });
});

export const getMyComplaints = catchAsync(async (req: Request, res: Response) => {
  if (!req.messMember) throw new AppError(403, 'Mapped user required');
  const result = await compService.getMyComplaints(req.messId!, req.messMember._id.toString(), req.query);
  sendResponse(res, { statusCode: 200, success: true, message: 'My complaints pulled', meta: result.meta, data: result.data });
});

export const getComplaintById = catchAsync(async (req: Request, res: Response) => {
  if (!req.messMember) throw new AppError(403, 'Context missing mapping bounds');
  const isManager = req.messMember.messRole === 'manager' || req.messRole === 'manager';
  sendResponse(res, { statusCode: 200, success: true, message: 'Complaint pulled', data: await compService.getComplaintById(req.messId!, String(req.params.complaintId), req.messMember._id.toString(), isManager) });
});

export const updateStatus = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Complaint status updated',
    data: await compService.updateComplaintStatus(req.messId!, String(req.params.complaintId), req.body.status, req.body.resolvedNote || '', req.user!.userId)
  });
});
