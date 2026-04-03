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
exports.reopenBilling = exports.finalizeBilling = exports.previewBilling = exports.getMemberBills = exports.getBillingCycles = void 0;
const asyncHandler_1 = require("../../shared/utils/asyncHandler");
const apiResponse_1 = require("../../shared/utils/apiResponse");
const billingService = __importStar(require("./billing.service"));
exports.getBillingCycles = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    const result = await billingService.getBillingCycles(req.messId);
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Billing cycles retrieved', data: result });
});
exports.getMemberBills = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    const result = await billingService.getMemberBills(req.messId, String(req.params.billingCycleId));
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Member bills retrieved', data: result });
});
exports.previewBilling = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    const { month, year } = req.body;
    const result = await billingService.previewBillingCycle(req.messId, parseInt(month), parseInt(year));
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Billing cycle preview fully mapped', data: result });
});
exports.finalizeBilling = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    const { month, year } = req.body;
    const result = await billingService.finalizeBillingCycle(req.messId, parseInt(month), parseInt(year), req.user.userId);
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Billing cycle successfully locked', data: result });
});
exports.reopenBilling = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    const result = await billingService.reopenBillingCycle(req.messId, String(req.params.billingCycleId));
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: result.message });
});
