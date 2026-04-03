"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markUtilityBillPaid = exports.getUtilityBills = exports.createUtilityBill = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const utility_bill_model_1 = require("./utility-bill.model");
const ledgerHelper_1 = require("../../shared/helpers/ledgerHelper");
const apiError_1 = require("../../shared/utils/apiError");
const ledgerEntryTypes_1 = require("../../constants/ledgerEntryTypes");
const createUtilityBill = async (messId, payload) => { return await utility_bill_model_1.UtilityBill.create({ messId, ...payload, status: 'unpaid' }); };
exports.createUtilityBill = createUtilityBill;
const getUtilityBills = async (messId) => { return await utility_bill_model_1.UtilityBill.find({ messId }).sort({ year: -1, billingMonth: -1 }); };
exports.getUtilityBills = getUtilityBills;
const markUtilityBillPaid = async (messId, billId) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const bill = await utility_bill_model_1.UtilityBill.findOne({ _id: billId, messId, status: 'unpaid' }).session(session);
        if (!bill)
            throw new apiError_1.AppError(404, 'Bill not found or already paid');
        bill.status = 'paid';
        await ledgerHelper_1.ledgerHelper.createCashOut({ messId, amount: bill.amount, referenceType: ledgerEntryTypes_1.REFERENCE_TYPES.UTILITY_BILL, referenceId: bill._id, description: `Utility bill paid: ${bill.category}`, date: new Date() }, session);
        await bill.save({ session });
        await session.commitTransaction();
        return bill;
    }
    catch (err) {
        await session.abortTransaction();
        throw err;
    }
    finally {
        session.endSession();
    }
};
exports.markUtilityBillPaid = markUtilityBillPaid;
