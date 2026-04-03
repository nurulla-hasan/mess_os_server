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
exports.reimburseExpense = exports.cancelExpense = exports.rejectExpense = exports.approveExpense = exports.getExpenseById = exports.getExpenses = exports.createExpense = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const expense_model_1 = require("./expense.model");
const ledgerHelper_1 = require("../../shared/helpers/ledgerHelper");
const apiError_1 = require("../../shared/utils/apiError");
const ledgerEntryTypes_1 = require("../../constants/ledgerEntryTypes");
const createExpense = async (messId, payload) => {
    return await expense_model_1.Expense.create({
        ...payload,
        messId: new mongoose_1.Types.ObjectId(messId),
        status: 'pending'
    });
};
exports.createExpense = createExpense;
const getExpenses = async (messId, query = {}) => {
    const filter = { messId: new mongoose_1.Types.ObjectId(messId) };
    if (query.paidBy)
        filter.paidBy = new mongoose_1.Types.ObjectId(query.paidBy);
    if (query.status)
        filter.status = query.status;
    if (query.fundSource)
        filter.fundSource = query.fundSource;
    return await expense_model_1.Expense.find(filter).sort({ date: -1 });
};
exports.getExpenses = getExpenses;
const getExpenseById = async (messId, expenseId) => {
    const exp = await expense_model_1.Expense.findOne({ _id: new mongoose_1.Types.ObjectId(expenseId), messId: new mongoose_1.Types.ObjectId(messId) });
    if (!exp)
        throw new apiError_1.AppError(404, 'Expense not found uniquely isolated securely');
    return exp;
};
exports.getExpenseById = getExpenseById;
const approveExpense = async (messId, expenseId, managerId) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const exp = await expense_model_1.Expense.findOne({ _id: new mongoose_1.Types.ObjectId(expenseId), messId: new mongoose_1.Types.ObjectId(messId), status: 'pending' }).session(session);
        if (!exp)
            throw new apiError_1.AppError(404, 'Expense not found or not pending');
        exp.status = 'approved';
        exp.approvedBy = new mongoose_1.Types.ObjectId(managerId);
        exp.approvedAt = new Date();
        if (exp.fundSource === ledgerEntryTypes_1.FUND_SOURCES.MESS_CASH) {
            await ledgerHelper_1.ledgerHelper.createCashOut({
                messId: new mongoose_1.Types.ObjectId(messId),
                amount: exp.amount,
                referenceType: ledgerEntryTypes_1.REFERENCE_TYPES.EXPENSE,
                referenceId: exp._id,
                description: `Expense approved from mess cash: ${exp.category}`,
                date: exp.date
            }, session);
        }
        else if (exp.fundSource === ledgerEntryTypes_1.FUND_SOURCES.PERSONAL_CASH) {
            await ledgerHelper_1.ledgerHelper.createMemberCredit({
                messId: new mongoose_1.Types.ObjectId(messId),
                messMemberId: exp.paidBy,
                amount: exp.amount,
                referenceType: ledgerEntryTypes_1.REFERENCE_TYPES.EXPENSE,
                referenceId: exp._id,
                description: `Personal expense credit for reimbursement: ${exp.category}`,
                date: exp.date
            }, session);
            exp.reimbursementStatus = 'pending';
        }
        await exp.save({ session });
        await session.commitTransaction();
        return exp;
    }
    catch (err) {
        await session.abortTransaction();
        throw err;
    }
    finally {
        session.endSession();
    }
};
exports.approveExpense = approveExpense;
const rejectExpense = async (messId, expenseId, managerId) => {
    const exp = await expense_model_1.Expense.findOneAndUpdate({ _id: new mongoose_1.Types.ObjectId(expenseId), messId: new mongoose_1.Types.ObjectId(messId), status: 'pending' }, { status: 'rejected', approvedBy: new mongoose_1.Types.ObjectId(managerId), approvedAt: new Date() }, { new: true });
    if (!exp)
        throw new apiError_1.AppError(404, 'Expense not found or not pending for rejection');
    return exp;
};
exports.rejectExpense = rejectExpense;
const cancelExpense = async (messId, expenseId, actorMemberId, actorRole) => {
    const exp = await expense_model_1.Expense.findOne({ _id: new mongoose_1.Types.ObjectId(expenseId), messId: new mongoose_1.Types.ObjectId(messId) });
    if (!exp)
        throw new apiError_1.AppError(404, 'Expense not found');
    if (exp.status !== 'pending')
        throw new apiError_1.AppError(400, 'Cannot cancel a processed expense record safely');
    // Ownership check
    const isOwner = exp.paidBy.toString() === actorMemberId;
    const isManager = actorRole === 'manager';
    if (!isOwner && !isManager) {
        throw new apiError_1.AppError(403, 'Unauthorized to explicitly cancel this expense record natively');
    }
    exp.status = 'canceled';
    return await exp.save();
};
exports.cancelExpense = cancelExpense;
const reimburseExpense = async (messId, expenseId, managerId) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const exp = await expense_model_1.Expense.findOne({ _id: new mongoose_1.Types.ObjectId(expenseId), messId: new mongoose_1.Types.ObjectId(messId), status: 'approved', fundSource: ledgerEntryTypes_1.FUND_SOURCES.PERSONAL_CASH }).session(session);
        if (!exp)
            throw new apiError_1.AppError(404, 'Expense not found or ineligible for reimbursement');
        if (exp.reimbursementStatus === 'reimbursed')
            throw new apiError_1.AppError(400, 'Expense is already reimbursed');
        exp.reimbursementStatus = 'reimbursed';
        await ledgerHelper_1.ledgerHelper.createCashOut({
            messId: new mongoose_1.Types.ObjectId(messId),
            amount: exp.amount,
            referenceType: ledgerEntryTypes_1.REFERENCE_TYPES.EXPENSE,
            referenceId: exp._id,
            description: `Reimbursement cash-out for: ${exp.category}`,
            date: new Date()
        }, session);
        await ledgerHelper_1.ledgerHelper.createMemberCharge({
            messId: new mongoose_1.Types.ObjectId(messId),
            messMemberId: exp.paidBy,
            amount: exp.amount,
            referenceType: ledgerEntryTypes_1.REFERENCE_TYPES.EXPENSE,
            referenceId: exp._id,
            description: `Reimbursement charge clearing credit for: ${exp.category}`,
            date: new Date()
        }, session);
        await exp.save({ session });
        await session.commitTransaction();
        return exp;
    }
    catch (err) {
        await session.abortTransaction();
        throw err;
    }
    finally {
        session.endSession();
    }
};
exports.reimburseExpense = reimburseExpense;
