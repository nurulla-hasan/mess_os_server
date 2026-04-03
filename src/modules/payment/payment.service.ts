import mongoose from 'mongoose';
import { Payment } from './payment.model';
import { ledgerHelper } from '../../shared/helpers/ledgerHelper';
import { AppError } from '../../shared/utils/apiError';
import { REFERENCE_TYPES } from '../../constants/ledgerEntryTypes';

export const createPayment = async (messId: string, payload: any) => {
  return await Payment.create({ messId, ...payload, status: 'pending' });
};

export const getPayments = async (messId: string) => {
  return await Payment.find({ messId }).sort({ createdAt: -1 });
};

export const approvePayment = async (messId: string, paymentId: string, managerId: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const pay = await Payment.findOne({ _id: paymentId, messId, status: 'pending' }).session(session);
    if (!pay) throw new AppError(404, 'Payment not found or not pending');

    pay.status = 'approved';
    pay.approvedBy = new mongoose.Types.ObjectId(managerId);
    pay.receivedDate = new Date();

    await ledgerHelper.createCashIn({ messId, amount: pay.amount, referenceType: REFERENCE_TYPES.PAYMENT, referenceId: pay._id, description: `Payment received`, date: pay.receivedDate }, session);
    await ledgerHelper.createMemberCredit({ messId, messMemberId: pay.messMemberId, amount: pay.amount, referenceType: REFERENCE_TYPES.PAYMENT, referenceId: pay._id, description: `Payment credit`, date: pay.receivedDate }, session);
    
    await pay.save({ session });
    await session.commitTransaction();
    return pay;
  } catch (err) { await session.abortTransaction(); throw err; } finally { session.endSession(); }
};
