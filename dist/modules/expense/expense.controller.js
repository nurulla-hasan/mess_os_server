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
exports.cancelExpense = exports.reimburseExpense = exports.rejectExpense = exports.approveExpense = exports.getExpenseById = exports.getExpenses = exports.createExpense = void 0;
const asyncHandler_1 = require("../../shared/utils/asyncHandler");
const apiResponse_1 = require("../../shared/utils/apiResponse");
const apiError_1 = require("../../shared/utils/apiError");
const expenseService = __importStar(require("./expense.service"));
exports.createExpense = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    const messId = req.messId;
    const body = req.body;
    const actor = req.messMember;
    if (body.paidBy && body.paidBy !== actor.id.toString()) {
        if (actor.messRole !== 'manager') {
            throw new apiError_1.AppError(403, 'Unauthorized to submit expenses for other members directly');
        }
    }
    else {
        body.paidBy = actor.id.toString();
    }
    const result = await expenseService.createExpense(messId, body);
    (0, apiResponse_1.sendResponse)(res, { statusCode: 201, success: true, message: 'Expense record created reliably', data: result });
});
exports.getExpenses = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    const result = await expenseService.getExpenses(req.messId, req.query);
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Expenses extracted', data: result });
});
exports.getExpenseById = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    const result = await expenseService.getExpenseById(req.messId, String(req.params.expenseId));
    // Safety check: Manager or Owner only
    const actor = req.messMember;
    if (actor.messRole !== 'manager' && result.paidBy.toString() !== actor.id.toString()) {
        throw new apiError_1.AppError(403, 'Unauthorized to view this specific expense record');
    }
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Expense record uniquely isolated', data: result });
});
exports.approveExpense = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    const result = await expenseService.approveExpense(req.messId, String(req.params.expenseId), req.user.userId);
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Expense approved and ledgered correctly', data: result });
});
exports.rejectExpense = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    const result = await expenseService.rejectExpense(req.messId, String(req.params.expenseId), req.user.userId);
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Expense record rejected by manager', data: result });
});
exports.reimburseExpense = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    const result = await expenseService.reimburseExpense(req.messId, String(req.params.expenseId), req.user.userId);
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Personal expense reimbursed from mess cash correctly', data: result });
});
exports.cancelExpense = (0, asyncHandler_1.catchAsync)(async (req, res) => {
    const actor = req.messMember;
    const result = await expenseService.cancelExpense(req.messId, String(req.params.expenseId), actor.id.toString(), actor.messRole);
    (0, apiResponse_1.sendResponse)(res, { statusCode: 200, success: true, message: 'Pending expense record canceled successfully', data: result });
});
