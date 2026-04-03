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
exports.exportPdfReport = exports.exportCsvReport = exports.getPaymentReport = exports.getExpenseReport = exports.getMemberStatement = exports.getMonthlyFinancials = exports.getMessSummary = void 0;
const asyncHandler_1 = require("../../shared/utils/asyncHandler");
const apiResponse_1 = require("../../shared/utils/apiResponse");
const rptService = __importStar(require("./report.service"));
const apiError_1 = require("../../shared/utils/apiError");
exports.getMessSummary = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Summary fetched', data: await rptService.getMessSummary(req.messId) });
});
exports.getMonthlyFinancials = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    const month = parseInt(String(req.query.month));
    const year = parseInt(String(req.query.year));
    if (!month || !year)
        throw new apiError_1.AppError(400, 'Month and year queries strictly required');
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Financials extracted via finalized tables', data: await rptService.getMonthlyFinancials(req.messId, month, year) });
});
exports.getMemberStatement = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    const isManager = req.messMember?.messRole === 'manager' || req.messRole === 'manager';
    const callerMemberId = req.messMember._id.toString();
    const targetMemberId = String(req.params.memberId);
    if (!isManager && targetMemberId !== callerMemberId) {
        throw new apiError_1.AppError(403, 'Permission denied, safe boundaries violated for accessing member statement');
    }
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Member statements calculated comprehensively', data: await rptService.getMemberStatement(req.messId, targetMemberId) });
});
exports.getExpenseReport = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Expenses aggregated securely', data: await rptService.getExpenseReport(req.messId, String(req.query.start), String(req.query.end)) });
});
exports.getPaymentReport = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Payments aggregated securely', data: await rptService.getPaymentReport(req.messId, String(req.query.start), String(req.query.end)) });
});
exports.exportCsvReport = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    const type = req.query.type || 'expenses';
    const csvData = await rptService.exportCsvReport(req.messId, type);
    res.header('Content-Type', 'text/csv');
    res.attachment(`mess-report-${type}-${Date.now()}.csv`);
    res.send(csvData);
});
exports.exportPdfReport = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    await rptService.exportPdfReport(req.messId);
});
