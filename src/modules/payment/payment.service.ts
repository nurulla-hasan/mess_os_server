import mongoose, { Types } from 'mongoose';
import { Payment } from './payment.model';
import { ledgerHelper } from '../../shared/helpers/ledgerHelper';
import { AppError } from '../../shared/utils/apiError';
import { REFERENCE_TYPES } from '../../constants/ledgerEntryTypes';
import { CreatePaymentPayload } from './payment.validation';
import { MessMember } from '../mess-member/mess-member.model';

const paymentPopulate = {
  path: 'messMemberId',
  select: 'userId messRole status participation',
  populate: { path: 'userId', select: 'fullName email phone avatarUrl' },
};

const assertActiveMemberInMess = async (messId: string, messMemberId: string) => {
  const member = await MessMember.findOne({
    _id: new Types.ObjectId(messMemberId),
    messId: new Types.ObjectId(messId),
    status: 'active',
  }).select('_id').lean();
  if (!member) throw new AppError(400, 'Payment must target an active member of this mess');
};

export const createPayment = async (messId: string, payload: CreatePaymentPayload) => {
  if (!payload.messMemberId) throw new AppError(400, 'messMemberId is required');
  await assertActiveMemberInMess(messId, payload.messMemberId);

  const payment = await Payment.create({
    ...payload,
    messId: new Types.ObjectId(messId),
    messMemberId: new Types.ObjectId(payload.messMemberId),
    status: 'pending'
  });

  return Payment.findById(payment._id).populate(paymentPopulate);
};

export const getPayments = async (messId: string, query: Record<string, unknown> = {}) => {
  const filter: Record<string, unknown> = { messId: new Types.ObjectId(messId) };
  if (query.messMemberId) filter.messMemberId = new Types.ObjectId(query.messMemberId as string);
  if (query.status) filter.status = query.status;
  
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const skip = (page - 1) * limit;

  const data = await Payment.find(filter)
    .populate(paymentPopulate)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  const total = await Payment.countDocuments(filter);

  return {
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    data
  };
};

export const getPaymentById = async (messId: string, paymentId: string) => {
  const pay = await Payment.findOne({ _id: new Types.ObjectId(paymentId), messId: new Types.ObjectId(messId) }).populate(paymentPopulate);
  if (!pay) throw new AppError(404, 'Payment not found');
  return pay;
};

const approvePayment = async (messId: string, paymentId: string, managerId: string) => {
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
    return Payment.findById(pay._id).populate(paymentPopulate);
  } catch (err) { 
    await session.abortTransaction(); 
    throw err; 
  } finally { 
    session.endSession(); 
  }
};

const rejectPayment = async (messId: string, paymentId: string, managerId: string) => {
  const pay = await Payment.findOneAndUpdate(
    { _id: new Types.ObjectId(paymentId), messId: new Types.ObjectId(messId), status: 'pending' },
    { status: 'rejected', approvedBy: new Types.ObjectId(managerId) },
    { new: true }
  );
  if (!pay) throw new AppError(404, 'Payment not found or not pending for rejection');
  return pay.populate(paymentPopulate);
};

const cancelPayment = async (messId: string, paymentId: string, actorMemberId: string, actorRole: string) => {
  const pay = await Payment.findOne({ _id: new Types.ObjectId(paymentId), messId: new Types.ObjectId(messId) });
  if (!pay) throw new AppError(404, 'Payment not found');
  
  if (pay.status !== 'pending') throw new AppError(400, 'Cannot cancel a processed payment record safely');
  
  // Ownership check
  const isOwner = pay.messMemberId.toString() === actorMemberId;
  const isManager = actorRole === 'manager';

  if (!isOwner && !isManager) {
     throw new AppError(403, 'You are not authorized to cancel this payment');
  }

  pay.status = 'canceled';
  await pay.save();
  return pay.populate(paymentPopulate);
};

export const updatePaymentStatus = async (
  messId: string,
  paymentId: string,
  status: 'approved' | 'rejected' | 'canceled',
  managerUserId: string,
  actorMemberId: string,
  actorRole: string
) => {
  if (status === 'approved') {
    if (actorRole !== 'manager') throw new AppError(403, 'Only managers can approve payments');
    return approvePayment(messId, paymentId, managerUserId);
  }
  if (status === 'rejected') {
    if (actorRole !== 'manager') throw new AppError(403, 'Only managers can reject payments');
    return rejectPayment(messId, paymentId, managerUserId);
  }
  if (status === 'canceled') return cancelPayment(messId, paymentId, actorMemberId, actorRole);
  throw new AppError(400, 'Invalid payment status');
};
