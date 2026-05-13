import mongoose from 'mongoose';
import { UtilityBill } from './utility-bill.model';
import { ledgerHelper } from '../../shared/helpers/ledgerHelper';
import { AppError } from '../../shared/utils/apiError';
import { REFERENCE_TYPES } from '../../constants/ledgerEntryTypes';
import { assertBillingCycleOpenForMonth } from '../billing/billing-lock.service';

export const createUtilityBill = async (messId: string, payload: any) => {
  await assertBillingCycleOpenForMonth(messId, payload.billingMonth, payload.year, 'Cannot create a utility bill for a finalized billing month');
  return await UtilityBill.create({ messId, ...payload, status: 'unpaid' });
};
export const getUtilityBills = async (messId: string) => { return await UtilityBill.find({ messId }).sort({ year: -1, billingMonth: -1 }); };

export const markUtilityBillPaid = async (messId: string, billId: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const bill = await UtilityBill.findOne({ _id: billId, messId, status: 'unpaid' }).session(session);
    if (!bill) throw new AppError(404, 'Bill not found or already paid');
    await assertBillingCycleOpenForMonth(messId, bill.billingMonth, bill.year, 'Cannot pay a utility bill for a finalized billing month');

    bill.status = 'paid';
    await ledgerHelper.createCashOut({ messId, amount: bill.amount, referenceType: REFERENCE_TYPES.UTILITY_BILL, referenceId: bill._id, description: `Utility bill paid: ${bill.category}`, date: new Date() }, session);

    await bill.save({ session });
    await session.commitTransaction();
    return bill;
  } catch (err) { await session.abortTransaction(); throw err; } finally { session.endSession(); }
};
