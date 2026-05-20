import mongoose from 'mongoose';
import { UtilityBill } from './utility-bill.model';
import { ledgerHelper } from '../../shared/helpers/ledgerHelper';
import { AppError } from '../../shared/utils/apiError';
import { REFERENCE_TYPES } from '../../constants/ledgerEntryTypes';
import { assertBillingCycleOpenForMonth } from '../billing/billing-lock.service';
import { normalizeMealDate } from '../../shared/utils/dateUtils';

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const assertUniqueUtilityBill = async (
  messId: string,
  category: string,
  billingMonth: number,
  year: number,
  excludeBillId?: string
) => {
  const query: any = {
    messId,
    category: { $regex: `^${escapeRegex(category.trim())}$`, $options: 'i' },
    billingMonth,
    year,
  };

  if (excludeBillId) query._id = { $ne: excludeBillId };

  const existing = await UtilityBill.exists(query);
  if (existing) {
    throw new AppError(409, 'A utility bill for this category and billing month already exists');
  }
};

export const createUtilityBill = async (messId: string, payload: any) => {
  await assertBillingCycleOpenForMonth(messId, payload.billingMonth, payload.year, 'Cannot create a utility bill for a finalized billing month');
  await assertUniqueUtilityBill(messId, payload.category, payload.billingMonth, payload.year);
  const dueDate = payload.dueDate ? normalizeMealDate(payload.dueDate) : undefined;
  return await UtilityBill.create({ messId, ...payload, category: payload.category.trim(), dueDate, status: 'unpaid' });
};
export const getUtilityBills = async (messId: string) => { return await UtilityBill.find({ messId }).sort({ year: -1, billingMonth: -1 }); };

export const updateUtilityBill = async (messId: string, billId: string, payload: any) => {
  const bill = await UtilityBill.findOne({ _id: billId, messId, status: 'unpaid' });
  if (!bill) throw new AppError(404, 'Bill not found or already paid');

  const billingMonth = payload.billingMonth ?? bill.billingMonth;
  const year = payload.year ?? bill.year;
  const category = payload.category?.trim() ?? bill.category;
  await assertBillingCycleOpenForMonth(messId, billingMonth, year, 'Cannot update a utility bill for a finalized billing month');
  await assertUniqueUtilityBill(messId, category, billingMonth, year, billId);

  if (payload.category !== undefined) bill.category = category;
  if (payload.amount !== undefined) bill.amount = payload.amount;
  if (payload.billingMonth !== undefined) bill.billingMonth = payload.billingMonth;
  if (payload.year !== undefined) bill.year = payload.year;
  if (payload.dueDate !== undefined) bill.dueDate = normalizeMealDate(payload.dueDate);

  await bill.save();
  return bill;
};

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
