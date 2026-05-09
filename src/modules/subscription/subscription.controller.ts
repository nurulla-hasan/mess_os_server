import { Request, Response } from 'express';
import { catchAsync } from '../../shared/utils/asyncHandler';
import { sendResponse } from '../../shared/utils/apiResponse';
import * as subService from './subscription.service';

export const getAvailablePlans = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Subscription plans retrieved', data: await subService.getAvailablePlans() });
});

export const getCurrentPlan = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Plan localized correctly', data: await subService.getCurrentPlan(req.messId!) });
});

export const startTrial = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 201, success: true, message: 'Default subscription initialized', data: await subService.startTrial(req.messId!) });
});

export const subscribePlan = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Subscription payment initialized or plan activated', data: await subService.subscribePlan(req.messId!, req.body.planId, req.user!.userId) });
});

export const cancelSubscription = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Subscription marked canceled downstream', data: await subService.cancelSubscription(req.messId!) });
});

export const getHistory = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Historical extraction mapped safely', data: await subService.getSubscriptionHistory(req.messId!) });
});

export const listPlansForAdmin = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Subscription plans retrieved for admin', data: await subService.listPlansForAdmin() });
});

export const createPlan = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 201, success: true, message: 'Subscription plan created successfully', data: await subService.createPlan(req.body) });
});

export const updatePlan = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Subscription plan updated successfully', data: await subService.updatePlan(String(req.params.planId), req.body) });
});

export const deletePlan = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, { statusCode: 200, success: true, message: 'Subscription plan deleted or deactivated successfully', data: await subService.deletePlan(String(req.params.planId)) });
});

export const sslCommerzSuccess = catchAsync(async (req: Request, res: Response) => {
  const payment = await subService.validateSslCommerzPayment({ ...req.body, ...req.query });
  const tranId = encodeURIComponent(payment.tranId);
  res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/payment/success?tran_id=${tranId}`);
});

export const sslCommerzIpn = catchAsync(async (req: Request, res: Response) => {
  const payment = await subService.validateSslCommerzPayment({ ...req.body, ...req.query });
  sendResponse(res, { statusCode: 200, success: true, message: 'SSLCommerz IPN validated successfully', data: payment });
});

export const sslCommerzFail = catchAsync(async (req: Request, res: Response) => {
  const payment = await subService.markSslCommerzPaymentFailed({ ...req.body, ...req.query }, 'failed');
  const tranId = encodeURIComponent(payment.tranId);
  res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/payment/failed?tran_id=${tranId}`);
});

export const sslCommerzCancel = catchAsync(async (req: Request, res: Response) => {
  const payment = await subService.markSslCommerzPaymentFailed({ ...req.body, ...req.query }, 'canceled');
  const tranId = encodeURIComponent(payment.tranId);
  res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/payment/canceled?tran_id=${tranId}`);
});
