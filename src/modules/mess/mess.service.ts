import crypto from 'crypto';
import mongoose from 'mongoose';
import { Mess } from './mess.model';
import { MessMember } from '../mess-member/mess-member.model';
import { AppError } from '../../shared/utils/apiError';
import { assignDefaultSubscription } from '../subscription/subscription.service';
import { Subscription } from '../subscription/subscription.model';
import { SubscriptionPlan } from '../subscription/subscription-plan.model';
import { Meal } from '../meal/meal.model';
import { Payment } from '../payment/payment.model';
import { Expense } from '../expense/expense.model';
import { UtilityBill } from '../utility-bill/utility-bill.model';
import { Complaint } from '../complaint/complaint.model';
import { MarketSchedule } from '../market-schedule/market-schedule.model';
import { Notice } from '../notice/notice.model';
import { CashLedger } from '../ledger/cash-ledger.model';
import { CASH_TRANSACTION_TYPES } from '../../constants/ledgerEntryTypes';
import { DHAKA_OFFSET_MS, getMonthBoundariesDhaka, normalizeMealDate } from '../../shared/utils/dateUtils';

// Generate a short random uppercase invite code (e.g. "A3F2B1C4")
const generateInviteCode = (): string =>
  crypto.randomBytes(4).toString('hex').toUpperCase();

export const createMess = async (userId: string, payload: { name: string; address: string; settings?: any }) => {
  const inviteCode = generateInviteCode();

  const mess = await Mess.create({ ...payload, inviteCode });

  // Add the creator as the manager of the newly created mess
  await MessMember.create({
    messId: mess._id,
    userId,
    messRole: 'manager',
    status: 'active',
    joinedAt: new Date(),
  });

  await assignDefaultSubscription(String(mess._id));

  return mess;
};

export const getMess = async (messId: string) => {
  const mess = await Mess.findById(messId);
  if (!mess) throw new AppError(404, 'Mess not found');
  return mess;
};

const sumField = async (model: any, match: Record<string, unknown>, field: string) => {
  const result = await model.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: `$${field}` }, count: { $sum: 1 } } },
  ]);
  return {
    amount: result[0]?.total ?? 0,
    count: result[0]?.count ?? 0,
  };
};

export const getDashboard = async (messId: string) => {
  const messObjectId = new mongoose.Types.ObjectId(messId);
  const mess = await Mess.findById(messId).lean();
  if (!mess) throw new AppError(404, 'Mess not found');

  const today = normalizeMealDate(new Date());
  const dhakaToday = new Date(today.getTime() + DHAKA_OFFSET_MS);
  const { start: monthStart, end: monthEnd } = getMonthBoundariesDhaka(dhakaToday.getUTCMonth() + 1, dhakaToday.getUTCFullYear());

  const [
    subscription,
    activeMembers,
    pendingJoinRequests,
    todayMeals,
    pendingPayments,
    monthlyExpenses,
    pendingExpenses,
    unpaidUtilities,
    openComplaints,
    pendingMarketDuties,
    cashSummary,
    recentNotices,
  ] = await Promise.all([
    Subscription.findOne({ messId: messObjectId }).lean(),
    MessMember.countDocuments({ messId, status: 'active' }),
    MessMember.countDocuments({ messId, status: 'pending' }),
    Meal.aggregate([
      { $match: { messId: messObjectId, date: today } },
      {
        $group: {
          _id: null,
          totalMeals: { $sum: '$mealCount' },
          records: { $sum: 1 },
          breakdowns: { $push: '$meals' },
        },
      },
    ]),
    sumField(Payment, { messId: messObjectId, status: 'pending' }, 'amount'),
    sumField(Expense, {
      messId: messObjectId,
      status: 'approved',
      date: { $gte: monthStart, $lte: monthEnd },
    }, 'amount'),
    sumField(Expense, { messId: messObjectId, status: 'pending' }, 'amount'),
    UtilityBill.countDocuments({ messId: messObjectId, status: 'unpaid' }),
    Complaint.countDocuments({ messId: messObjectId, status: { $in: ['open', 'in_progress'] } }),
    MarketSchedule.countDocuments({ messId: messObjectId, status: 'pending' }),
    CashLedger.aggregate([
      { $match: { messId: messObjectId, isVoided: false } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
        },
      },
    ]),
    Notice.find({ messId: messObjectId, status: 'active' })
      .select('title content isPinned createdAt createdBy')
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(3)
      .lean(),
  ]);

  const plan = subscription ? await SubscriptionPlan.findOne({ code: subscription.planId }).select('name code price currency billingCycle maxMembers').lean() : null;

  const mealBreakdown: Record<string, number> = {};
  for (const breakdown of todayMeals[0]?.breakdowns ?? []) {
    const entries = breakdown instanceof Map ? Array.from(breakdown.entries()) : Object.entries(breakdown ?? {});
    for (const [category, count] of entries) {
      mealBreakdown[category] = (mealBreakdown[category] ?? 0) + Number(count || 0);
    }
  }

  const cashIn = cashSummary.find((item: any) => item._id === CASH_TRANSACTION_TYPES.IN)?.total ?? 0;
  const cashOut = cashSummary.find((item: any) => item._id === CASH_TRANSACTION_TYPES.OUT)?.total ?? 0;

  return {
    mess,
    subscription: subscription ? { ...subscription, plan } : null,
    summary: {
      activeMembers,
      pendingJoinRequests,
      todayMeals: todayMeals[0]?.totalMeals ?? 0,
      todayMealRecords: todayMeals[0]?.records ?? 0,
      pendingPaymentsAmount: pendingPayments.amount,
      pendingPaymentsCount: pendingPayments.count,
      monthlyExpensesAmount: monthlyExpenses.amount,
      monthlyExpensesCount: monthlyExpenses.count,
      pendingExpensesAmount: pendingExpenses.amount,
      pendingExpensesCount: pendingExpenses.count,
      unpaidUtilities,
      openComplaints,
      pendingMarketDuties,
      totalMessFund: cashIn - cashOut,
      totalDeposits: cashIn,
      totalCashOut: cashOut,
    },
    today: {
      date: today,
      mealBreakdown,
    },
    recent: {
      notices: recentNotices,
    },
    pendingActions: {
      joinRequests: pendingJoinRequests,
      payments: pendingPayments.count,
      expenses: pendingExpenses.count,
      utilities: unpaidUtilities,
      complaints: openComplaints,
      marketDuties: pendingMarketDuties,
    },
  };
};

export const updateMess = async (messId: string, payload: { name?: string; address?: string; settings?: any }) => {
  const mess = await Mess.findByIdAndUpdate(messId, payload, { new: true, runValidators: true });
  if (!mess) throw new AppError(404, 'Mess not found');
  return mess;
};

export const regenerateInviteCode = async (messId: string) => {
  const inviteCode = generateInviteCode();
  const mess = await Mess.findByIdAndUpdate(messId, { inviteCode }, { new: true });
  if (!mess) throw new AppError(404, 'Mess not found');
  return mess;
};

export const transferOwnership = async (messId: string, currentManagerId: string, newManagerUserId: string) => {
  // Prevent transferring ownership to yourself
  if (currentManagerId === newManagerUserId) {
    throw new AppError(400, 'You cannot transfer ownership to yourself');
  }

  // Verify the target user is an active member of this mess
  const newManager = await MessMember.findOne({ messId, userId: newManagerUserId, status: 'active' });
  if (!newManager) throw new AppError(400, 'Target user is not an active member of this mess');

  // Prevent promoting someone who is already the manager
  if (newManager.messRole === 'manager') {
    throw new AppError(400, 'Target user is already the manager of this mess');
  }

  // Demote the current manager to member
  await MessMember.findOneAndUpdate(
    { messId, userId: currentManagerId },
    { messRole: 'member' }
  );

  // Promote the new user to manager
  await MessMember.findOneAndUpdate(
    { messId, userId: newManagerUserId },
    { messRole: 'manager' }
  );

  return { message: 'Ownership transferred successfully' };
};
