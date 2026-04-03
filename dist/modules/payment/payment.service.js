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
exports.cancelPayment = exports.rejectPayment = exports.approvePayment = exports.getPaymentById = exports.getPayments = exports.createPayment = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const payment_model_1 = require("./payment.model");
const ledgerHelper_1 = require("../../shared/helpers/ledgerHelper");
const apiError_1 = require("../../shared/utils/apiError");
const ledgerEntryTypes_1 = require("../../constants/ledgerEntryTypes");
const createPayment = async (messId, payload) => {
    return await payment_model_1.Payment.create({
        ...payload,
        messId: new mongoose_1.Types.ObjectId(messId),
        status: 'pending'
    });
};
exports.createPayment = createPayment;
const getPayments = async (messId, query = {}) => {
    const filter = { messId: new mongoose_1.Types.ObjectId(messId) };
    if (query.messMemberId)
        filter.messMemberId = new mongoose_1.Types.ObjectId(query.messMemberId);
    if (query.status)
        filter.status = query.status;
    return await payment_model_1.Payment.find(filter).sort({ createdAt: -1 });
};
exports.getPayments = getPayments;
const getPaymentById = async (messId, paymentId) => {
    const pay = await payment_model_1.Payment.findOne({ _id: new mongoose_1.Types.ObjectId(paymentId), messId: new mongoose_1.Types.ObjectId(messId) });
    if (!pay)
        throw new apiError_1.AppError(404, 'Payment not found uniquely isolated securely');
    return pay;
};
exports.getPaymentById = getPaymentById;
const approvePayment = async (messId, paymentId, managerId) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const pay = await payment_model_1.Payment.findOne({ _id: new mongoose_1.Types.ObjectId(paymentId), messId: new mongoose_1.Types.ObjectId(messId), status: 'pending' }).session(session);
        if (!pay)
            throw new apiError_1.AppError(404, 'Payment not found or not pending');
        pay.status = 'approved';
        pay.approvedBy = new mongoose_1.Types.ObjectId(managerId);
        pay.receivedDate = new Date();
        await ledgerHelper_1.ledgerHelper.createCashIn({
            messId: new mongoose_1.Types.ObjectId(messId),
            amount: pay.amount,
            referenceType: ledgerEntryTypes_1.REFERENCE_TYPES.PAYMENT,
            referenceId: pay._id,
            description: `Payment received from member`,
            date: pay.receivedDate
        }, session);
        await ledgerHelper_1.ledgerHelper.createMemberCredit({
            messId: new mongoose_1.Types.ObjectId(messId),
            messMemberId: pay.messMemberId,
            amount: pay.amount,
            referenceType: ledgerEntryTypes_1.REFERENCE_TYPES.PAYMENT,
            referenceId: pay._id,
            description: `Payment credit for balance`,
            date: pay.receivedDate
        }, session);
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
const rejectPayment = async (messId, paymentId, managerId) => {
    const pay = await payment_model_1.Payment.findOneAndUpdate({ _id: new mongoose_1.Types.ObjectId(paymentId), messId: new mongoose_1.Types.ObjectId(messId), status: 'pending' }, { status: 'rejected', approvedBy: new mongoose_1.Types.ObjectId(managerId) }, { new: true });
    if (!pay)
        throw new apiError_1.AppError(404, 'Payment not found or not pending for rejection');
    return pay;
};
exports.rejectPayment = rejectPayment;
const cancelPayment = async (messId, paymentId, actorMemberId, actorRole) => {
    const pay = await payment_model_1.Payment.findOne({ _id: new mongoose_1.Types.ObjectId(paymentId), messId: new mongoose_1.Types.ObjectId(messId) });
    if (!pay)
        throw new apiError_1.AppError(404, 'Payment not found');
    if (pay.status !== 'pending')
        throw new apiError_1.AppError(400, 'Cannot cancel a processed payment record safely');
    // Ownership check
    const isOwner = pay.messMemberId.toString() === actorMemberId;
    const isManager = actorRole === 'manager';
    if (!isOwner && !isManager) {
        throw new apiError_1.AppError(403, 'Unauthorized to explicitly cancel this payment record natively');
    }
    pay.status = 'canceled';
    return await pay.save();
};
exports.cancelPayment = cancelPayment;
