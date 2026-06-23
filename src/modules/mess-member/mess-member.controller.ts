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
  const page = parseInt(String(req.query.page)) || 1;
  const limit = parseInt(String(req.query.limit)) || 10;
  const canViewNonActiveMembers = req.messRole === 'manager' || req.user?.globalRole === 'super_admin';

  if ((!status || status !== 'active') && !canViewNonActiveMembers) {
    throw new AppError(403, 'Only mess managers can view all or non-active members');
  }

  const result = await memberService.getMembers(req.messId!, { status, searchTerm, page, limit });
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Members fetched successfully',
    meta: result.pagination,
    data: result.items,
  });
});

export const getActiveMemberOptions = catchAsync(async (req: Request, res: Response) => {
  const result = await memberService.getActiveMemberOptions(req.messId!);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Active member options fetched successfully',
    data: result,
  });
});

export const updatePendingMemberStatus = catchAsync(async (req: Request, res: Response) => {
  const member = await memberService.updatePendingMemberStatus(
    req.messId!,
    req.params.memberId as string,
    req.body.status
  );
  const action = req.body.status === 'active' ? 'approved' : 'rejected';
  sendResponse(res, { statusCode: 200, success: true, message: `Member ${action} successfully`, data: member });
});

export const updateMemberParticipation = catchAsync(async (req: Request, res: Response) => {
  const member = await memberService.updateMemberParticipation(
    req.messId!,
    req.params.memberId as string,
    req.body
  );
  sendResponse(res, { statusCode: 200, success: true, message: 'Member participation updated successfully', data: member });
});

export const removeMember = catchAsync(async (req: Request, res: Response) => {
  const member = await memberService.removeMember(req.messId!, req.params.memberId as string);
  sendResponse(res, { statusCode: 200, success: true, message: 'Member removed successfully', data: member });
});

export const requestResidentToggle = catchAsync(async (req: Request, res: Response) => {
  const currentMemberId = String(req.messMember?._id ?? '');
  const result = await memberService.requestResidentToggle(
    req.messId!,
    req.params.memberId as string,
    currentMemberId
  );

  if (result.instant) {
    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Manager is now set as Resident and will be included in billing.',
      data: result.manager,
    });
  }

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Toggle request sent to members. Waiting for at least 3 approvals.',
    data: result.request,
  });
});

export const acceptResidentToggle = catchAsync(async (req: Request, res: Response) => {
  const currentMemberId = String(req.messMember?._id ?? '');
  const result = await memberService.acceptResidentToggleRequest(
    req.messId!,
    req.body.requestId,
    currentMemberId
  );

  const message = result.approved
    ? 'Request approved! Manager has been set as External and excluded from billing.'
    : `You accepted the request (${result.acceptCount}/3 approvals).`;

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message,
    data: result,
  });
});

export const getPendingToggleRequests = catchAsync(async (req: Request, res: Response) => {
  const requests = await memberService.getPendingToggleRequests(req.messId!);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Pending toggle requests fetched successfully',
    data: requests,
  });
});
