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
exports.markPaid = exports.getUtilityBills = exports.createUtilityBill = void 0;
const asyncHandler_1 = require("../../shared/utils/asyncHandler");
const apiResponse_1 = require("../../shared/utils/apiResponse");
const ubService = __importStar(require("./utility-bill.service"));
exports.createUtilityBill = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    const result = await ubService.createUtilityBill(req.messId, req.body);
    (0, apiResponse_1.sendResponse)(res, { statusCode: 201, success: true, message: 'Utility bill added', data: result });
});
exports.getUtilityBills = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    const result = await ubService.getUtilityBills(req.messId);
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Utility bills retrieved', data: result });
});
exports.markPaid = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    const result = await ubService.markUtilityBillPaid(req.messId, String(req.params.billId));
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Utility bill explicitly tracked via cash ledger flow', data: result });
});
