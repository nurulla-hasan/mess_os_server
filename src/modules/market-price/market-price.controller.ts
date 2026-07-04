import { Request, Response } from 'express';
import { catchAsync } from '../../shared/utils/asyncHandler';
import { sendResponse } from '../../shared/utils/apiResponse';
import * as marketPriceService from './market-price.service';

export const getMarketPrices = catchAsync(async (req: Request, res: Response) => {
  const messId = req.messId!;
  const prices = await marketPriceService.getMarketPrices(messId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Market prices fetched successfully',
    data: prices,
  });
});

export const upsertMarketPrice = catchAsync(async (req: Request, res: Response) => {
  const messId = req.messId!;
  const price = await marketPriceService.upsertMarketPrice(messId, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Market price saved successfully',
    data: price,
  });
});

export const bulkUpsertMarketPrices = catchAsync(async (req: Request, res: Response) => {
  const messId = req.messId!;
  const prices = await marketPriceService.bulkUpsertMarketPrices(messId, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Market prices updated successfully',
    data: prices,
  });
});

export const deleteMarketPrice = catchAsync(async (req: Request, res: Response) => {
  const messId = req.messId!;
  const { itemName } = req.params;
  await marketPriceService.deleteMarketPrice(messId, decodeURIComponent(itemName));
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Market price deleted successfully',
  });
});

export const resetMarketPrices = catchAsync(async (req: Request, res: Response) => {
  const messId = req.messId!;
  const prices = await marketPriceService.resetMarketPricesToDefault(messId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Market prices reset to default successfully',
    data: prices,
  });
});
