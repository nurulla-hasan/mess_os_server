"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reimburseExpense = exports.approveExpense = exports.getExpenses = exports.createExpense = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const expense_model_1 = require("./expense.model");
const ledgerHelper_1 = require("../../shared/helpers/ledgerHelper");
const apiError_1 = require("../../shared/utils/apiError");
const ledgerEntryTypes_1 = require("../../constants/ledgerEntryTypes");
const createExpense = async (messId, payload) => { return await expense_model_1.Expense.create({ messId, ...payload, status: 'pending' }); };
exports.createExpense = createExpense;
const getExpenses = async (messId) => { return await expense_model_1.Expense.find({ messId }).sort({ date: -1 }); };
exports.getExpenses = getExpenses;
const approveExpense = async (messId, expenseId, managerId) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const exp = await expense_model_1.Expense.findOne({ _id: expenseId, messId, status: 'pending' }).session(session);
        if (!exp)
            throw new apiError_1.AppError(404, 'Expense not found or not pending');
        exp.status = 'approved';
        exp.approvedBy = new mongoose_1.default.Types.ObjectId(managerId);
        exp.approvedAt = new Date();
        if (exp.fundSource === ledgerEntryTypes_1.FUND_SOURCES.MESS_CASH) {
            await ledgerHelper_1.ledgerHelper.createCashOut({ messId, amount: exp.amount, referenceType: ledgerEntryTypes_1.REFERENCE_TYPES.EXPENSE, referenceId: exp._id, description: `Expense from cash: ${exp.category}`, date: exp.date }, session);
        }
        else if (exp.fundSource === ledgerEntryTypes_1.FUND_SOURCES.PERSONAL_CASH) {
            await ledgerHelper_1.ledgerHelper.createMemberCredit({ messId, messMemberId: exp.paidBy, amount: exp.amount, referenceType: ledgerEntryTypes_1.REFERENCE_TYPES.EXPENSE, referenceId: exp._id, description: `Personal expense credit: ${exp.category}`, date: exp.date }, session);
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
const reimburseExpense = async (messId, expenseId, managerId) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const exp = await expense_model_1.Expense.findOne({ _id: expenseId, messId, status: 'approved', fundSource: ledgerEntryTypes_1.FUND_SOURCES.PERSONAL_CASH }).session(session);
        if (!exp)
            throw new apiError_1.AppError(404, 'Expense not found or ineligible for reimbursement');
        if (exp.reimbursementStatus === 'reimbursed')
            throw new apiError_1.AppError(400, 'Expense is already reimbursed');
        exp.reimbursementStatus = 'reimbursed';
        await ledgerHelper_1.ledgerHelper.createCashOut({ messId, amount: exp.amount, referenceType: ledgerEntryTypes_1.REFERENCE_TYPES.EXPENSE, referenceId: exp._id, description: `Reimburse expense`, date: new Date() }, session);
        await ledgerHelper_1.ledgerHelper.createMemberCharge({ messId, messMemberId: exp.paidBy, amount: exp.amount, referenceType: ledgerEntryTypes_1.REFERENCE_TYPES.EXPENSE, referenceId: exp._id, description: `Reimbursement charge clearing credit`, date: new Date() }, session);
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
