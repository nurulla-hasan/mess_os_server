import { Request, Response } from 'express';
import { catchAsync } from '../../shared/utils/asyncHandler';
import { sendResponse } from '../../shared/utils/apiResponse';
import * as aiService from './ai-shopping.service';

export const generateList = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 201, success: true, message: 'AI shopping draft loaded', data: await aiService.generateShoppingList(req.messId!, req.body, req.user!.userId) });
});

export const getLists = catchAsync(async (req: Request, res: Response) => {
  const result = await aiService.getShoppingLists(req.messId!, req.query);
  sendResponse(res, { statusCode: 200, success: true, message: 'Lists fetched', meta: result.meta, data: result.data });
});

export const getListById = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'List fetched', data: await aiService.getShoppingListById(req.messId!, String(req.params.listId)) });
});

export const updateListStatus = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: req.body.status === 'approved' ? 'Shopping list approved' : 'Shopping list rejected',
    data: await aiService.updateShoppingListStatus(req.messId!, String(req.params.listId), req.body.status)
  });
});

export const convertList = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 201, success: true, message: 'List converted strictly to Market Schedule', data: await aiService.convertToMarketSchedule(req.messId!, String(req.params.listId), req.user!.userId, req.body) });
});
