import { CashLedger } from '../ledger/cash-ledger.model';
import { MemberLedger } from '../ledger/member-ledger.model';
import { BillingCycle } from '../billing/billing-cycle.model';
import { MemberBill } from '../billing/member-bill.model';
import { Expense } from '../expense/expense.model';
import { Payment } from '../payment/payment.model';
import { MessMember } from '../mess-member/mess-member.model';
import { AppError } from '../../shared/utils/apiError';
import { parseAsync } from 'json2csv';
import mongoose from 'mongoose';
import { getDhakaDayBounds, getMonthBoundariesDhaka } from '../../shared/utils/dateUtils';
import { CASH_TRANSACTION_TYPES } from '../../constants/ledgerEntryTypes';

type ReportOptions = {
   start?: string;
   end?: string;
   month?: string;
   year?: string;
   scope?: 'all' | 'my';
   messMemberId?: string;
   memberId?: string;
   requesterMemberId?: string;
   isManager?: boolean;
};

const memberPopulate = {
   select: 'userId messRole status participation',
   populate: { path: 'userId', select: 'fullName email phone avatarUrl' },
};

const expensePopulate = [
   { path: 'paidBy', ...memberPopulate },
   { path: 'approvedBy', select: 'fullName email phone avatarUrl' },
];

const paymentPopulate = [
   { path: 'messMemberId', ...memberPopulate },
   { path: 'approvedBy', select: 'fullName email phone avatarUrl' },
];

const normalizeMemberRef = (member: any) => {
   if (!member?.userId) return member;
   const { userId, ...rest } = member;
   return { ...rest, user: userId };
};

const normalizeExpense = (expense: any) => {
   const raw = typeof expense.toObject === 'function' ? expense.toObject() : expense;
   return { ...raw, paidBy: normalizeMemberRef(raw.paidBy) };
};

const normalizePayment = (payment: any) => {
   const raw = typeof payment.toObject === 'function' ? payment.toObject() : payment;
   return { ...raw, messMemberId: normalizeMemberRef(raw.messMemberId) };
};

const getDateRange = (options: ReportOptions): { start?: Date; end?: Date } => {
   if (options.month && options.year) {
      const month = Number(options.month);
      const year = Number(options.year);
      return getMonthBoundariesDhaka(month, year);
   }

   if (options.start && options.end) {
      return { start: getDhakaDayBounds(options.start).start, end: getDhakaDayBounds(options.end).end };
   }

   return {};
};

const getRequestedMemberId = (options: ReportOptions) => options.messMemberId || options.memberId;

const applyMemberScope = (query: Record<string, unknown>, field: string, options: ReportOptions) => {
   const requestedMemberId = getRequestedMemberId(options);
   const isOwnScope = options.scope === 'my' || !options.isManager;

   if (isOwnScope) {
      if (!options.requesterMemberId) throw new AppError(403, 'Active member context is required');
      query[field] = new mongoose.Types.ObjectId(options.requesterMemberId);
      return;
   }

   if (requestedMemberId) {
      query[field] = new mongoose.Types.ObjectId(requestedMemberId);
   }
};

export const getMessSummary = async (messId: string) => {
   const cashLedgers = await CashLedger.find({ messId: new mongoose.Types.ObjectId(messId), isVoided: false });
   const totalMessCash = cashLedgers.reduce(
      (sum, ledger) => sum + (ledger.type === CASH_TRANSACTION_TYPES.IN ? ledger.amount : -ledger.amount),
      0
   );
   
   const pendingExpenses = await Expense.countDocuments({ messId, status: 'pending' });
   const pendingPayments = await Payment.countDocuments({ messId, status: 'pending' });
   const finalizedCycles = await BillingCycle.countDocuments({ messId, status: 'finalized' });

   return { totalMessCash, pendingExpenses, pendingPayments, finalizedCycles };
};

export const getMonthlyFinancials = async (messId: string, month: number, year: number) => {
   const cycle = await BillingCycle.findOne({ messId, month, year, status: 'finalized' });
   return cycle || null;
};

export const getMemberStatement = async (messId: string, memberId: string) => {
   const member = await MessMember.findOne({ _id: memberId, messId })
      .select('userId messRole status participation joinedAt leftAt')
      .populate('userId', 'fullName email phone avatarUrl')
      .lean();
   if (!member) throw new AppError(404, 'Member not found in this mess');

   const bills = await MemberBill.find({ messId, messMemberId: new mongoose.Types.ObjectId(memberId), isArchived: false }).sort({ createdAt: -1 });
   const ledgers = await MemberLedger.find({ messId, messMemberId: new mongoose.Types.ObjectId(memberId), isVoided: false }).sort({ date: 1, createdAt: 1 });
   
   let runningBalance = 0;
   ledgers.forEach(l => {
     runningBalance += l.type === 'CHARGE' ? l.amount : -l.amount;
   });

   return { member: normalizeMemberRef(member), historicalFinalizations: bills, ledgers, liveCurrentBalance: runningBalance };
};

export const getExpenseReport = async (messId: string, options: ReportOptions = {}) => {
   const query: Record<string, unknown> = { messId, status: 'approved' };
   const range = getDateRange(options);
   if (range.start && range.end) {
       query.date = { $gte: range.start, $lte: range.end };
   }
   applyMemberScope(query, 'paidBy', options);

   const data = await Expense.find(query).populate(expensePopulate).sort({ date: -1 });
   const totalAmount = data.reduce((sum, expense) => sum + expense.amount, 0);
   return { summary: { totalAmount, totalRecords: data.length }, data: data.map(normalizeExpense) };
};

export const getPaymentReport = async (messId: string, options: ReportOptions = {}) => {
   const query: Record<string, unknown> = { messId, status: 'approved' };
   const range = getDateRange(options);
   if (range.start && range.end) {
       // Approved financial reporting uses receivedDate as the canonical accounting boundary natively
       query.receivedDate = { $gte: range.start, $lte: range.end };
   }
   applyMemberScope(query, 'messMemberId', options);

   const data = await Payment.find(query).populate(paymentPopulate).sort({ receivedDate: -1 });
   const totalAmount = data.reduce((sum, payment) => sum + payment.amount, 0);
   return { summary: { totalAmount, totalRecords: data.length }, data: data.map(normalizePayment) };
};

export const exportCsvReport = async (messId: string, type: 'expenses'|'payments', options: ReportOptions = {}) => {
   let data: object[];
   if (type === 'expenses') {
       const query: Record<string, unknown> = { messId, status: 'approved' };
       const range = getDateRange(options);
       if (range.start && range.end) query.date = { $gte: range.start, $lte: range.end };
       data = await Expense.find(query).sort({ date: -1 }).lean() as object[];
   } else {
       const query: Record<string, unknown> = { messId, status: 'approved' };
       const range = getDateRange(options);
       if (range.start && range.end) query.receivedDate = { $gte: range.start, $lte: range.end };
       data = await Payment.find(query).sort({ receivedDate: -1 }).lean() as object[];
   }
   
   if (!data || data.length === 0) throw new AppError(404, 'No approved records found to export');
   
   return await parseAsync(data);
};

export const exportPdfReport = async (messId: string) => {
   throw new AppError(501, 'PDF generation is not yet implemented');
};
