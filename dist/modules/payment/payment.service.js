"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.approvePayment = exports.getPayments = exports.createPayment = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const payment_model_1 = require("./payment.model");
const ledgerHelper_1 = require("../../shared/helpers/ledgerHelper");
const apiError_1 = require("../../shared/utils/apiError");
const ledgerEntryTypes_1 = require("../../constants/ledgerEntryTypes");
const createPayment = async (messId, payload) => {
    return await payment_model_1.Payment.create({ messId, ...payload, status: 'pending' });
};
exports.createPayment = createPayment;
const getPayments = async (messId) => {
    return await payment_model_1.Payment.find({ messId }).sort({ createdAt: -1 });
};
exports.getPayments = getPayments;
const approvePayment = async (messId, paymentId, managerId) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const pay = await payment_model_1.Payment.findOne({ _id: paymentId, messId, status: 'pending' }).session(session);
        if (!pay)
            throw new apiError_1.AppError(404, 'Payment not found or not pending');
        pay.status = 'approved';
        pay.approvedBy = new mongoose_1.default.Types.ObjectId(managerId);
        pay.receivedDate = new Date();
        await ledgerHelper_1.ledgerHelper.createCashIn({ messId, amount: pay.amount, referenceType: ledgerEntryTypes_1.REFERENCE_TYPES.PAYMENT, referenceId: pay._id, description: `Payment received`, date: pay.receivedDate }, session);
        await ledgerHelper_1.ledgerHelper.createMemberCredit({ messId, messMemberId: pay.messMemberId, amount: pay.amount, referenceType: ledgerEntryTypes_1.REFERENCE_TYPES.PAYMENT, referenceId: pay._id, description: `Payment credit`, date: pay.receivedDate }, session);
        await pay.save({ session });
        await session.commitTransaction();
        return pay;
    }
    catch (err) {
        await session.abortTransaction();
        throw err;
    }
    finally {
        session.endSession();
    }
};
exports.approvePayment = approvePayment;
