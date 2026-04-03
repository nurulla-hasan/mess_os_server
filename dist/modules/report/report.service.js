"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportPdfReport = exports.exportCsvReport = exports.getPaymentReport = exports.getExpenseReport = exports.getMemberStatement = exports.getMonthlyFinancials = exports.getMessSummary = void 0;
const cash_ledger_model_1 = require("../ledger/cash-ledger.model");
const member_ledger_model_1 = require("../ledger/member-ledger.model");
const billing_cycle_model_1 = require("../billing/billing-cycle.model");
const member_bill_model_1 = require("../billing/member-bill.model");
const expense_model_1 = require("../expense/expense.model");
const payment_model_1 = require("../payment/payment.model");
const apiError_1 = require("../../shared/utils/apiError");
const json2csv_1 = require("json2csv");
const mongoose_1 = __importDefault(require("mongoose"));
const getMessSummary = async (messId) => {
    const cashLedgers = await cash_ledger_model_1.CashLedger.find({ messId, isVoided: false });
    const totalMessCash = cashLedgers.reduce((sum, l) => sum + (l.type === 'IN' ? l.amount : -l.amount), 0);
    const pendingExpenses = await expense_model_1.Expense.countDocuments({ messId, status: 'pending' });
    const pendingPayments = await payment_model_1.Payment.countDocuments({ messId, status: 'pending' });
    const finalizedCycles = await billing_cycle_model_1.BillingCycle.countDocuments({ messId, status: 'finalized' });
    return { totalMessCash, pendingExpenses, pendingPayments, finalizedCycles };
};
exports.getMessSummary = getMessSummary;
const getMonthlyFinancials = async (messId, month, year) => {
    const cycle = await billing_cycle_model_1.BillingCycle.findOne({ messId, month, year, status: 'finalized' });
    if (!cycle)
        throw new apiError_1.AppError(404, 'Finalized billing cycle not found safely for this strict period');
    return cycle;
};
exports.getMonthlyFinancials = getMonthlyFinancials;
const getMemberStatement = async (messId, memberId) => {
    const bills = await member_bill_model_1.MemberBill.find({ messId, messMemberId: new mongoose_1.default.Types.ObjectId(memberId), isArchived: false }).sort({ createdAt: -1 });
    const ledgers = await member_ledger_model_1.MemberLedger.find({ messId, messMemberId: new mongoose_1.default.Types.ObjectId(memberId), isVoided: false });
    let runningBalance = 0;
    ledgers.forEach(l => {
        runningBalance += l.type === 'CHARGE' ? l.amount : -l.amount;
    });
    return { historicalFinalizations: bills, liveCurrentBalance: runningBalance };
};
exports.getMemberStatement = getMemberStatement;
const getExpenseReport = async (messId, start, end) => {
    const query = { messId };
    if (start && end) {
        query.date = { $gte: new Date(start), $lte: new Date(end) };
    }
    return await expense_model_1.Expense.find(query).sort({ date: -1 });
};
exports.getExpenseReport = getExpenseReport;
const getPaymentReport = async (messId, start, end) => {
    const query = { messId };
    if (start && end) {
        query.date = { $gte: new Date(start), $lte: new Date(end) };
    }
    return await payment_model_1.Payment.find(query).sort({ date: -1 });
};
exports.getPaymentReport = getPaymentReport;
const exportCsvReport = async (messId, type) => {
    let data;
    if (type === 'expenses')
        data = await expense_model_1.Expense.find({ messId, status: 'approved' }).lean();
    else
        data = await payment_model_1.Payment.find({ messId, status: 'approved' }).lean();
    return await (0, json2csv_1.parseAsync)(data);
};
exports.exportCsvReport = exportCsvReport;
const exportPdfReport = async (messId) => {
    throw new apiError_1.AppError(501, 'PDF binary generation explicitly unimplemented. Structural framework waiting on external wkhtmltopdf integration');
};
exports.exportPdfReport = exportPdfReport;
