import { CashLedger } from '../ledger/cash-ledger.model';
import { MemberLedger } from '../ledger/member-ledger.model';
import { BillingCycle } from '../billing/billing-cycle.model';
import { MemberBill } from '../billing/member-bill.model';
import { Expense } from '../expense/expense.model';
import { Payment } from '../payment/payment.model';
import { AppError } from '../../shared/utils/apiError';
import { parseAsync } from 'json2csv';
import mongoose from 'mongoose';

export const getMessSummary = async (messId: string) => {
   const cashLedgers = await CashLedger.find({ messId, isVoided: false });
   const totalMessCash = cashLedgers.reduce((sum, l) => sum + (l.type === 'IN' ? l.amount : -l.amount), 0);
   
   const pendingExpenses = await Expense.countDocuments({ messId, status: 'pending' });
   const pendingPayments = await Payment.countDocuments({ messId, status: 'pending' });
   const finalizedCycles = await BillingCycle.countDocuments({ messId, status: 'finalized' });

   return { totalMessCash, pendingExpenses, pendingPayments, finalizedCycles };
};

export const getMonthlyFinancials = async (messId: string, month: number, year: number) => {
   const cycle = await BillingCycle.findOne({ messId, month, year, status: 'finalized' });
   if (!cycle) throw new AppError(404, 'Finalized billing cycle not found safely for this strict period');
   return cycle;
};

export const getMemberStatement = async (messId: string, memberId: string) => {
   const bills = await MemberBill.find({ messId, messMemberId: new mongoose.Types.ObjectId(memberId), isArchived: false }).sort({ createdAt: -1 });
   const ledgers = await MemberLedger.find({ messId, messMemberId: new mongoose.Types.ObjectId(memberId), isVoided: false });
   
   let runningBalance = 0;
   ledgers.forEach(l => {
     runningBalance += l.type === 'CHARGE' ? l.amount : -l.amount;
   });

   return { historicalFinalizations: bills, liveCurrentBalance: runningBalance };
};

export const getExpenseReport = async (messId: string, start?: string, end?: string) => {
   const query: any = { messId };
   if (start && end) {
       query.date = { $gte: new Date(start), $lte: new Date(end) };
   }
   return await Expense.find(query).sort({ date: -1 });
};

export const getPaymentReport = async (messId: string, start?: string, end?: string) => {
   const query: any = { messId };
   if (start && end) {
       // Corrected path: Payment model uses createdAt as primary time boundary for reports consistently
       query.createdAt = { $gte: new Date(start), $lte: new Date(end) };
   }
   return await Payment.find(query).sort({ createdAt: -1 });
};

export const exportCsvReport = async (messId: string, type: 'expenses'|'payments') => {
   let data: object[];
   if (type === 'expenses') {
       data = await Expense.find({ messId, status: 'approved' }).sort({ date: -1 }).lean() as object[];
   } else {
       data = await Payment.find({ messId, status: 'approved' }).sort({ createdAt: -1 }).lean() as object[];
   }
   
   if (!data || data.length === 0) throw new AppError(404, 'No approved records found to export natively');
   
   return await parseAsync(data);
};

export const exportPdfReport = async (messId: string) => {
   throw new AppError(501, 'PDF binary generation explicitly unimplemented. Structural framework waiting on external wkhtmltopdf integration');
};
