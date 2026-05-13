import mongoose, { Types } from 'mongoose';
import { Expense } from './expense.model';
import { ledgerHelper } from '../../shared/helpers/ledgerHelper';
import { AppError } from '../../shared/utils/apiError';
import { REFERENCE_TYPES, FUND_SOURCES } from '../../constants/ledgerEntryTypes';
import { CreateExpensePayload } from './expense.validation';
import { MessMember } from '../mess-member/mess-member.model';
import { isAfterTodayDhaka } from '../../shared/utils/dateUtils';

const expensePopulate = {
  path: 'paidBy',
  select: 'userId messRole status participation',
  populate: { path: 'userId', select: 'fullName email phone avatarUrl' },
};

const assertActiveMemberInMess = async (messId: string, messMemberId: string) => {
  const member = await MessMember.findOne({
    _id: new Types.ObjectId(messMemberId),
    messId: new Types.ObjectId(messId),
    status: 'active',
  }).select('_id').lean();
  if (!member) throw new AppError(400, 'Expense must target an active member of this mess');
};

export const createExpense = async (messId: string, payload: CreateExpensePayload) => {
  if (!payload.paidBy) throw new AppError(400, 'paidBy is required');
  if (isAfterTodayDhaka(payload.date)) throw new AppError(400, 'Expense date cannot be in the future');
  await assertActiveMemberInMess(messId, payload.paidBy);

  const expense = await Expense.create({
    ...payload,
    messId: new Types.ObjectId(messId),
    paidBy: new Types.ObjectId(payload.paidBy),
    status: 'pending'
  });

  return Expense.findById(expense._id).populate(expensePopulate);
};

export const getExpenses = async (messId: string, query: any = {}) => { 
  const filter: any = { messId: new Types.ObjectId(messId) };
  if (query.paidBy) filter.paidBy = new Types.ObjectId(query.paidBy as string);
  if (query.status) filter.status = query.status;
  if (query.fundSource) filter.fundSource = query.fundSource;
  
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const skip = (page - 1) * limit;

  const data = await Expense.find(filter).populate(expensePopulate).sort({ date: -1 }).skip(skip).limit(limit);
  const total = await Expense.countDocuments(filter);

  return {
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    data
  };
};

export const getExpenseById = async (messId: string, expenseId: string) => {
  const exp = await Expense.findOne({ _id: new Types.ObjectId(expenseId), messId: new Types.ObjectId(messId) }).populate(expensePopulate);
  if (!exp) throw new AppError(404, 'Expense not found');
  return exp;
};

const approveExpense = async (messId: string, expenseId: string, managerId: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const exp = await Expense.findOne({ _id: new Types.ObjectId(expenseId), messId: new Types.ObjectId(messId), status: 'pending' }).session(session);
    if (!exp) throw new AppError(404, 'Expense not found or not pending');

    exp.status = 'approved';
    exp.approvedBy = new Types.ObjectId(managerId);
    exp.approvedAt = new Date();

    if (exp.fundSource === FUND_SOURCES.MESS_CASH) {
      await ledgerHelper.createCashOut({ 
        messId: new Types.ObjectId(messId), 
        amount: exp.amount, 
        referenceType: REFERENCE_TYPES.EXPENSE, 
        referenceId: exp._id as Types.ObjectId, 
        description: `Expense approved from mess cash: ${exp.category}`, 
        date: exp.date 
      }, session);
    } else if (exp.fundSource === FUND_SOURCES.PERSONAL_CASH) {
      await ledgerHelper.createMemberCredit({ 
        messId: new Types.ObjectId(messId), 
        messMemberId: exp.paidBy, 
        amount: exp.amount, 
        referenceType: REFERENCE_TYPES.EXPENSE, 
        referenceId: exp._id as Types.ObjectId, 
        description: `Personal expense credit for reimbursement: ${exp.category}`, 
        date: exp.date 
      }, session);
      exp.reimbursementStatus = 'pending';
    }
    
    await exp.save({ session });
    await session.commitTransaction();
    return Expense.findById(exp._id).populate(expensePopulate);
  } catch (err) { 
    await session.abortTransaction(); 
    throw err; 
  } finally { 
    session.endSession(); 
  }
};

const rejectExpense = async (messId: string, expenseId: string, managerId: string) => {
  const exp = await Expense.findOneAndUpdate(
    { _id: new Types.ObjectId(expenseId), messId: new Types.ObjectId(messId), status: 'pending' },
    { status: 'rejected', approvedBy: new Types.ObjectId(managerId), approvedAt: new Date() },
    { new: true }
  );
  if (!exp) throw new AppError(404, 'Expense not found or not pending for rejection');
  return exp.populate(expensePopulate);
};

export const cancelExpense = async (messId: string, expenseId: string, actorMemberId: string, actorRole: string) => {
  const exp = await Expense.findOne({ _id: new Types.ObjectId(expenseId), messId: new Types.ObjectId(messId) });
  if (!exp) throw new AppError(404, 'Expense not found');
  
  if (exp.status !== 'pending') throw new AppError(400, 'Cannot cancel a processed expense record safely');
  
  // Ownership check
  const isOwner = exp.paidBy.toString() === actorMemberId;
  const isManager = actorRole === 'manager';

  if (!isOwner && !isManager) {
     throw new AppError(403, 'You are not authorized to cancel this expense');
  }

  exp.status = 'canceled';
  await exp.save();
  return exp.populate(expensePopulate);
};

export const updateExpenseStatus = async (
  messId: string,
  expenseId: string,
  status: 'approved' | 'rejected' | 'canceled',
  managerUserId: string,
  actorMemberId: string,
  actorRole: string
) => {
  if (status === 'approved') {
    if (actorRole !== 'manager') throw new AppError(403, 'Only managers can approve expenses');
    return approveExpense(messId, expenseId, managerUserId);
  }
  if (status === 'rejected') {
    if (actorRole !== 'manager') throw new AppError(403, 'Only managers can reject expenses');
    return rejectExpense(messId, expenseId, managerUserId);
  }
  if (status === 'canceled') return cancelExpense(messId, expenseId, actorMemberId, actorRole);
  throw new AppError(400, 'Invalid expense status');
};

export const reimburseExpense = async (messId: string, expenseId: string, managerId: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const exp = await Expense.findOne({ _id: new Types.ObjectId(expenseId), messId: new Types.ObjectId(messId), status: 'approved', fundSource: FUND_SOURCES.PERSONAL_CASH }).session(session);
    if (!exp) throw new AppError(404, 'Expense not found or ineligible for reimbursement');
    if (exp.reimbursementStatus === 'reimbursed') throw new AppError(400, 'Expense is already reimbursed');

    exp.reimbursementStatus = 'reimbursed';
    
    await ledgerHelper.createCashOut({ 
      messId: new Types.ObjectId(messId), 
      amount: exp.amount, 
      referenceType: REFERENCE_TYPES.EXPENSE, 
      referenceId: exp._id as Types.ObjectId, 
      description: `Reimbursement cash-out for: ${exp.category}`, 
      date: new Date() 
    }, session);
    
    await ledgerHelper.createMemberCharge({ 
      messId: new Types.ObjectId(messId), 
      messMemberId: exp.paidBy, 
      amount: exp.amount, 
      referenceType: REFERENCE_TYPES.EXPENSE, 
      referenceId: exp._id as Types.ObjectId, 
      description: `Reimbursement charge clearing credit for: ${exp.category}`, 
      date: new Date() 
    }, session);

    await exp.save({ session });
    await session.commitTransaction();
    return Expense.findById(exp._id).populate(expensePopulate);
  } catch (err) { await session.abortTransaction(); throw err; } finally { session.endSession(); }
};
