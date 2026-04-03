import mongoose from 'mongoose';
import { Expense } from './expense.model';
import { ledgerHelper } from '../../shared/helpers/ledgerHelper';
import { AppError } from '../../shared/utils/apiError';
import { REFERENCE_TYPES, FUND_SOURCES } from '../../constants/ledgerEntryTypes';

export const createExpense = async (messId: string, payload: any) => { return await Expense.create({ messId, ...payload, status: 'pending' }); };
export const getExpenses = async (messId: string) => { return await Expense.find({ messId }).sort({ date: -1 }); };

export const approveExpense = async (messId: string, expenseId: string, managerId: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const exp = await Expense.findOne({ _id: expenseId, messId, status: 'pending' }).session(session);
    if (!exp) throw new AppError(404, 'Expense not found or not pending');

    exp.status = 'approved';
    exp.approvedBy = new mongoose.Types.ObjectId(managerId);
    exp.approvedAt = new Date();

    if (exp.fundSource === FUND_SOURCES.MESS_CASH) {
      await ledgerHelper.createCashOut({ messId, amount: exp.amount, referenceType: REFERENCE_TYPES.EXPENSE, referenceId: exp._id, description: `Expense from cash: ${exp.category}`, date: exp.date }, session);
    } else if (exp.fundSource === FUND_SOURCES.PERSONAL_CASH) {
      await ledgerHelper.createMemberCredit({ messId, messMemberId: exp.paidBy, amount: exp.amount, referenceType: REFERENCE_TYPES.EXPENSE, referenceId: exp._id, description: `Personal expense credit: ${exp.category}`, date: exp.date }, session);
    }
    
    await exp.save({ session });
    await session.commitTransaction();
    return exp;
  } catch (err) { await session.abortTransaction(); throw err; } finally { session.endSession(); }
};

export const reimburseExpense = async (messId: string, expenseId: string, managerId: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const exp = await Expense.findOne({ _id: expenseId, messId, status: 'approved', fundSource: FUND_SOURCES.PERSONAL_CASH }).session(session);
    if (!exp) throw new AppError(404, 'Expense not found or ineligible for reimbursement');
    if (exp.reimbursementStatus === 'reimbursed') throw new AppError(400, 'Expense is already reimbursed');

    exp.reimbursementStatus = 'reimbursed';
    await ledgerHelper.createCashOut({ messId, amount: exp.amount, referenceType: REFERENCE_TYPES.EXPENSE, referenceId: exp._id, description: `Reimburse expense`, date: new Date() }, session);
    await ledgerHelper.createMemberCharge({ messId, messMemberId: exp.paidBy, amount: exp.amount, referenceType: REFERENCE_TYPES.EXPENSE, referenceId: exp._id, description: `Reimbursement charge clearing credit`, date: new Date() }, session);

    await exp.save({ session });
    await session.commitTransaction();
    return exp;
  } catch (err) { await session.abortTransaction(); throw err; } finally { session.endSession(); }
};
