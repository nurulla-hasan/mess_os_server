import { Request, Response } from 'express';
import { catchAsync } from '../../shared/utils/asyncHandler';
import { sendResponse } from '../../shared/utils/apiResponse';
import { AppError } from '../../shared/utils/apiError';
import * as memberService from './mess-member.service';
import { MemberStatus } from './mess-member.service';

export const requestJoin = catchAsync(async (req: Request, res: Response) => {
  const member = await memberService.requestJoin(req.user!.userId, req.body.inviteCode);
  sendResponse(res, { statusCode: 201, success: true, message: 'Join request sent successfully', data: member });
});

export const getMembers = catchAsync(async (req: Request, res: Response) => {
  const status = req.query.status as MemberStatus | undefined;
  const searchTerm = req.query.searchTerm as string | undefined;
  const canViewNonActiveMembers = req.messRole === 'manager' || req.user?.globalRole === 'super_admin';

  if ((!status || status !== 'active') && !canViewNonActiveMembers) {
    throw new AppError(403, 'Only mess managers can view all or non-active members');
  }

  const members = await memberService.getMembers(req.messId!, { status, searchTerm });
  sendResponse(res, { statusCode: 200, success: true, message: 'Members fetched successfully', data: members });
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
