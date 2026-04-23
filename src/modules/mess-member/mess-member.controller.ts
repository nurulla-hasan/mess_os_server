import { Request, Response } from 'express';
import { catchAsync } from '../../shared/utils/asyncHandler';
import { sendResponse } from '../../shared/utils/apiResponse';
import * as memberService from './mess-member.service';

export const requestJoin = catchAsync(async (req: Request, res: Response) => {
  const member = await memberService.requestJoin(req.user!.userId, req.body.inviteCode);
  sendResponse(res, { statusCode: 201, success: true, message: 'Join request sent successfully', data: member });
});

export const getMembers = catchAsync(async (req: Request, res: Response) => {
  const members = await memberService.getMembers(req.messId!);
  sendResponse(res, { statusCode: 200, success: true, message: 'Members fetched successfully', data: members });
});

export const getPendingRequests = catchAsync(async (req: Request, res: Response) => {
  const members = await memberService.getPendingRequests(req.messId!);
  sendResponse(res, { statusCode: 200, success: true, message: 'Pending join requests fetched', data: members });
});

export const approveMember = catchAsync(async (req: Request, res: Response) => {
  const member = await memberService.approveMember(req.messId!, req.params.memberId as string);
  sendResponse(res, { statusCode: 200, success: true, message: 'Member approved successfully', data: member });
});

export const rejectMember = catchAsync(async (req: Request, res: Response) => {
  const member = await memberService.rejectMember(req.messId!, req.params.memberId as string);
  sendResponse(res, { statusCode: 200, success: true, message: 'Member rejected successfully', data: member });
});

export const removeMember = catchAsync(async (req: Request, res: Response) => {
  const member = await memberService.removeMember(req.messId!, req.params.memberId as string);
  sendResponse(res, { statusCode: 200, success: true, message: 'Member removed successfully', data: member });
});
