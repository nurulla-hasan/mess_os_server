"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelPayment = exports.rejectPayment = exports.approvePayment = exports.getMyPayments = exports.getPaymentById = exports.getPayments = exports.createPayment = void 0;
const asyncHandler_1 = require("../../shared/utils/asyncHandler");
const apiResponse_1 = require("../../shared/utils/apiResponse");
const apiError_1 = require("../../shared/utils/apiError");
const paymentService = __importStar(require("./payment.service"));
exports.createPayment = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    const messId = req.messId;
    const body = req.body;
    const actor = req.messMember;
    if (body.messMemberId && body.messMemberId !== actor.id.toString()) {
        if (actor.messRole !== 'manager') {
            throw new apiError_1.AppError(403, 'Unauthorized to create payments for other members directly');
        }
    }
    else {
        body.messMemberId = actor.id.toString();
    }
    const result = await paymentService.createPayment(messId, body);
    (0, apiResponse_1.sendResponse)(res, { statusCode: 201, success: true, message: 'Payment record created natively reflecting accurately', data: result });
});
exports.getPayments = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    const result = await paymentService.getPayments(req.messId, req.query);
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Payments retrieved', data: result });
});
exports.getPaymentById = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    const result = await paymentService.getPaymentById(req.messId, String(req.params.paymentId));
    // Safety check: Manager or Owner only
    const actor = req.messMember;
    if (actor.messRole !== 'manager' && result.messMemberId.toString() !== actor.id.toString()) {
        throw new apiError_1.AppError(403, 'Unauthorized to view this specific payment record');
    }
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Payment record accurately isolated', data: result });
});
exports.getMyPayments = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    const result = await paymentService.getPayments(req.messId, { messMemberId: req.messMember.id.toString() });
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Your payment history extracted', data: result });
});
exports.approvePayment = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    const result = await paymentService.approvePayment(req.messId, String(req.params.paymentId), req.user.userId);
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Payment approved and ledgered correctly', data: result });
});
exports.rejectPayment = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    const result = await paymentService.rejectPayment(req.messId, String(req.params.paymentId), req.user.userId);
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Payment record rejected by manager', data: result });
});
exports.cancelPayment = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    const actor = req.messMember;
    const result = await paymentService.cancelPayment(req.messId, String(req.params.paymentId), actor.id.toString(), actor.messRole);
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Pending payment record canceled successfully', data: result });
});
