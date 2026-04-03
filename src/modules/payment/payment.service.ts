import mongoose, { Types } from 'mongoose';
import { Payment } from './payment.model';
import { ledgerHelper } from '../../shared/helpers/ledgerHelper';
import { AppError } from '../../shared/utils/apiError';
import { REFERENCE_TYPES } from '../../constants/ledgerEntryTypes';

export const createPayment = async (messId: string, payload: any) => {
  return await Payment.create({
    ...payload,
    messId: new Types.ObjectId(messId),
    status: 'pending'
  });
};

export const getPayments = async (messId: string, query: any = {}) => {
  const filter: any = { messId: new Types.ObjectId(messId) };
  if (query.messMemberId) filter.messMemberId = new Types.ObjectId(query.messMemberId);
  if (query.status) filter.status = query.status;
  
  return await Payment.find(filter).sort({ createdAt: -1 });
};

export const getPaymentById = async (messId: string, paymentId: string) => {
  const pay = await Payment.findOne({ _id: new Types.ObjectId(paymentId), messId: new Types.ObjectId(messId) });
  if (!pay) throw new AppError(404, 'Payment not found accurately isolated securely');
  return pay;
};

export const approvePayment = async (messId: string, paymentId: string, managerId: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const pay = await Payment.findOne({ _id: new Types.ObjectId(paymentId), messId: new Types.ObjectId(messId), status: 'pending' }).session(session);
    if (!pay) throw new AppError(404, 'Payment not found or not pending');

    pay.status = 'approved';
    pay.approvedBy = new Types.ObjectId(managerId);
    pay.receivedDate = new Date();

    await ledgerHelper.createCashIn({ 
      messId: new Types.ObjectId(messId), 
      amount: pay.amount, 
      referenceType: REFERENCE_TYPES.PAYMENT, 
      referenceId: pay._id as Types.ObjectId, 
      description: `Payment received from member`, 
      date: pay.receivedDate 
    }, session);
    
    await ledgerHelper.createMemberCredit({ 
      messId: new Types.ObjectId(messId), 
      messMemberId: pay.messMemberId, 
      amount: pay.amount, 
      referenceType: REFERENCE_TYPES.PAYMENT, 
      referenceId: pay._id as Types.ObjectId, 
      description: `Payment credit for balance`, 
      date: pay.receivedDate 
    }, session);
    
    await pay.save({ session });
    await session.commitTransaction();
    return pay;
  } catch (err) { 
    await session.abortTransaction(); 
    throw err; 
  } finally { 
    session.endSession(); 
  }
};

export const rejectPayment = async (messId: string, paymentId: string, managerId: string) => {
  const pay = await Payment.findOneAndUpdate(
    { _id: new Types.ObjectId(paymentId), messId: new Types.ObjectId(messId), status: 'pending' },
    { status: 'rejected', approvedBy: new Types.ObjectId(managerId) },
    { new: true }
  );
  if (!pay) throw new AppError(404, 'Payment not found or not pending for rejection');
  return pay;
};

export const cancelPayment = async (messId: string, paymentId: string, actorMemberId: string) => {
  const pay = await Payment.findOne({ _id: new Types.ObjectId(paymentId), messId: new Types.ObjectId(messId) });
  if (!pay) throw new AppError(404, 'Payment not found');
  if (pay.status !== 'pending') throw new AppError(400, 'Cannot cancel a processed payment');
  
  // Safety: only the owner or a manager can delete/cancel a pending payment
  // (In service we often just check existence and status, but ownership is checked in controller usually. 
  // However we can pass actorMemberId here for extra safety.)
  
  if (pay.messMemberId.toString() !== actorMemberId) {
     throw new AppError(403, 'Unauthorized to cancel another member\'s payment natively');
  }

  return await Payment.findByIdAndDelete(paymentId);
};
