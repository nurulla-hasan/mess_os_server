import { Request, Response } from 'express';
import { catchAsync } from '../../shared/utils/asyncHandler';
import { sendResponse } from '../../shared/utils/apiResponse';
import * as msService from './market-schedule.service';
import { AppError } from '../../shared/utils/apiError';

export const createSchedule = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 201, success: true, message: 'Schedule assigned', data: await msService.createSchedule(req.messId!, req.body, req.user!.userId) });
});

export const getSchedules = catchAsync(async (req: Request, res: Response) => {
  const result = await msService.getSchedules(req.messId!, req.query);
  sendResponse(res, { statusCode: 200, success: true, message: 'Schedules loaded', meta: result.meta, data: result.data });
});

export const getMyDuties = catchAsync(async (req: Request, res: Response) => {
  if (!req.messMember) throw new AppError(403, 'Context missing mapping bounds');
  const result = await msService.getMyDuties(req.messId!, req.messMember._id.toString(), req.query);
  sendResponse(res, { statusCode: 200, success: true, message: 'Duties found', meta: result.meta, data: result.data });
});

export const updateSchedule = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Schedule mutated', data: await msService.updateSchedule(req.messId!, String(req.params.scheduleId), req.body) });
});

export const updateActualSpent = catchAsync(async (req: Request, res: Response) => {
  if (!req.messMember) throw new AppError(403, 'Context missing mapping bounds');
  const isManager = req.messMember.messRole === 'manager' || req.messRole === 'manager';
  sendResponse(res, { statusCode: 200, success: true, message: 'Spent budget updated', data: await msService.updateActualSpent(req.messId!, String(req.params.scheduleId), req.body.actualSpent, req.messMember._id.toString(), isManager) });
});

export const updateScheduleStatus = catchAsync(async (req: Request, res: Response) => {
  if (!req.messMember) throw new AppError(403, 'Context missing mapping bounds');
  const isManager = req.messMember.messRole === 'manager' || req.messRole === 'manager';
  const result = await msService.updateScheduleStatus(req.messId!, String(req.params.scheduleId), req.body, req.messMember._id.toString(), req.user!.userId, isManager);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: req.body.status === 'completed' ? 'Schedule fulfilled and expense fully mapped' : 'Schedule permanently voided',
    data: result
  });
});
