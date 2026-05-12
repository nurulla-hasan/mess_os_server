import { Request, Response } from 'express';
import { catchAsync } from '../../shared/utils/asyncHandler';
import { sendResponse } from '../../shared/utils/apiResponse';
import * as menuService from './menu-plan.service';

export const createMenuPlan = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 201, success: true, message: 'Menu drafted', data: await menuService.createMenuPlan(req.messId!, req.body, req.user!.userId) });
});

export const getMenuPlans = catchAsync(async (req: Request, res: Response) => {
  const start = req.query.start ? String(req.query.start) : req.query.startDate ? String(req.query.startDate) : undefined;
  const end = req.query.end ? String(req.query.end) : req.query.endDate ? String(req.query.endDate) : undefined;
  const result = await menuService.getMenuPlans(req.messId!, {
    page: parseInt(String(req.query.page)) || 1,
    limit: parseInt(String(req.query.limit)) || 8,
    status: req.query.status ? String(req.query.status) as menuService.MenuPlanStatus : undefined,
    start,
    end,
  });
  sendResponse(res, { statusCode: 200, success: true, message: 'Menus read', meta: result.pagination, data: result.items });
});

export const updateMenuPlan = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Menu updated', data: await menuService.updateMenuPlan(req.messId!, String(req.params.planId), req.body) });
});

export const updateMenuPlanStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await menuService.updateMenuPlanStatus(req.messId!, String(req.params.planId), req.body.status);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: req.body.status === 'published' ? 'Menu published' : 'Menu archived',
    data: result,
  });
});
