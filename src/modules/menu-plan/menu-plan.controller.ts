import { Request, Response } from 'express';
import { catchAsync } from '../../shared/utils/asyncHandler';
import { sendResponse } from '../../shared/utils/apiResponse';
import * as menuService from './menu-plan.service';

export const createMenuPlan = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 201, success: true, message: 'Menu drafted', data: await menuService.createMenuPlan(req.messId!, req.body, req.user!.userId) });
});

export const getMenuPlans = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Menus read', data: await menuService.getMenuPlans(req.messId!) });
});

export const getMenuPlanById = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Menu found', data: await menuService.getMenuPlanById(req.messId!, req.params.planId) });
});

export const getMenuPlanByDate = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Menu found via date', data: await menuService.getMenuPlanByDate(req.messId!, req.params.date) });
});

export const updateMenuPlan = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Menu updated', data: await menuService.updateMenuPlan(req.messId!, req.params.planId, req.body) });
});

export const publishMenuPlan = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Menu published', data: await menuService.publishMenuPlan(req.messId!, req.params.planId) });
});

export const archiveMenuPlan = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Menu archived', data: await menuService.archiveMenuPlan(req.messId!, req.params.planId) });
});
