import { Request, Response } from 'express';
import { catchAsync } from '../../shared/utils/asyncHandler';
import { sendResponse } from '../../shared/utils/apiResponse';
import * as noteService from './notice.service';

export const createNotice = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 201, success: true, message: 'Notice created', data: await noteService.createNotice(req.messId!, req.body, req.user!.userId) });
});

export const getNotices = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Notices listed', data: await noteService.getNotices(req.messId!) });
});

export const getNotice = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Notice found', data: await noteService.getNotice(req.messId!, String(req.params.noticeId)) });
});

export const updateNotice = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Notice updated', data: await noteService.updateNotice(req.messId!, String(req.params.noticeId), req.body) });
});

export const pinNotice = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Notice pinned', data: await noteService.pinNotice(req.messId!, String(req.params.noticeId)) });
});

export const archiveNotice = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Notice archived', data: await noteService.archiveNotice(req.messId!, String(req.params.noticeId)) });
});
