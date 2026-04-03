import { Request, Response } from 'express';
import { catchAsync } from '../../shared/utils/asyncHandler';
import { sendResponse } from '../../shared/utils/apiResponse';
import * as msService from './market-schedule.service';
import { AppError } from '../../shared/utils/apiError';

export const createSchedule = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 201, success: true, message: 'Schedule assigned', data: await msService.createSchedule(req.messId!, req.body, req.user!.userId) });
});

export const getSchedules = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Schedules loaded', data: await msService.getSchedules(req.messId!) });
});

export const getMyDuties = catchAsync(async (req: Request, res: Response) => {
  if (!req.messMember) throw new AppError(403, 'Context missing mapping bounds');
  sendResponse(res, { statusCode: 200, success: true, message: 'Duties found', data: await msService.getMyDuties(req.messId!, req.messMember._id.toString()) });
});

export const updateSchedule = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Schedule mutated', data: await msService.updateSchedule(req.messId!, String(req.params.scheduleId), req.body) });
});

export const reassignSchedule = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Schedule reassigned', data: await msService.reassignSchedule(req.messId!, String(req.params.scheduleId), req.body.assignedTo) });
});

export const updateActualSpent = catchAsync(async (req: Request, res: Response) => {
  if (!req.messMember) throw new AppError(403, 'Context missing mapping bounds');
  const isManager = req.messMember.messRole === 'manager' || req.messRole === 'manager';
  sendResponse(res, { statusCode: 200, success: true, message: 'Spent budget updated', data: await msService.updateActualSpent(req.messId!, String(req.params.scheduleId), req.body.actualSpent, req.messMember._id.toString(), isManager) });
});

export const voidSchedule = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Schedule permanently voided', data: await msService.voidSchedule(req.messId!, String(req.params.scheduleId)) });
});

export const completeSchedule = catchAsync(async (req: Request, res: Response) => {
  if (!req.messMember) throw new AppError(403, 'Context missing mapping bounds');
  const isManager = req.messMember.messRole === 'manager' || req.messRole === 'manager';
  sendResponse(res, { statusCode: 200, success: true, message: 'Schedule fulfilled and expense fully mapped', data: await msService.completeSchedule(req.messId!, String(req.params.scheduleId), req.body, req.messMember._id.toString(), req.user!.userId, isManager) });
});
