import mongoose, { Types } from 'mongoose';
import { Expense } from './expense.model';
import { ledgerHelper } from '../../shared/helpers/ledgerHelper';
import { AppError } from '../../shared/utils/apiError';
import { REFERENCE_TYPES, FUND_SOURCES } from '../../constants/ledgerEntryTypes';

export const createExpense = async (messId: string, payload: any) => { 
  return await Expense.create({ 
    ...payload,
    messId: new Types.ObjectId(messId), 
    status: 'pending' 
  }); 
};

export const getExpenses = async (messId: string, query: any = {}) => { 
  const filter: any = { messId: new Types.ObjectId(messId) };
  if (query.paidBy) filter.paidBy = new Types.ObjectId(query.paidBy);
  if (query.status) filter.status = query.status;
  if (query.fundSource) filter.fundSource = query.fundSource;
  
  return await Expense.find(filter).sort({ date: -1 }); 
};

export const getExpenseById = async (messId: string, expenseId: string) => {
  const exp = await Expense.findOne({ _id: new Types.ObjectId(expenseId), messId: new Types.ObjectId(messId) });
  if (!exp) throw new AppError(404, 'Expense not found uniquely isolated securely');
  return exp;
};

export const approveExpense = async (messId: string, expenseId: string, managerId: string) => {
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
    return exp;
  } catch (err) { 
    await session.abortTransaction(); 
    throw err; 
  } finally { 
    session.endSession(); 
  }
};

export const rejectExpense = async (messId: string, expenseId: string, managerId: string) => {
  const exp = await Expense.findOneAndUpdate(
    { _id: new Types.ObjectId(expenseId), messId: new Types.ObjectId(messId), status: 'pending' },
    { status: 'rejected', approvedBy: new Types.ObjectId(managerId), approvedAt: new Date() },
    { new: true }
  );
  if (!exp) throw new AppError(404, 'Expense not found or not pending for rejection');
  return exp;
};

export const cancelExpense = async (messId: string, expenseId: string, actorMemberId: string, actorRole: string) => {
  const exp = await Expense.findOne({ _id: new Types.ObjectId(expenseId), messId: new Types.ObjectId(messId) });
  if (!exp) throw new AppError(404, 'Expense not found');
  
  if (exp.status !== 'pending') throw new AppError(400, 'Cannot cancel a processed expense record safely');
  
  // Ownership check
  const isOwner = exp.paidBy.toString() === actorMemberId;
  const isManager = actorRole === 'manager';

  if (!isOwner && !isManager) {
     throw new AppError(403, 'Unauthorized to explicitly cancel this expense record natively');
  }

  exp.status = 'canceled';
  return await exp.save();
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
    return exp;
  } catch (err) { await session.abortTransaction(); throw err; } finally { session.endSession(); }
};
