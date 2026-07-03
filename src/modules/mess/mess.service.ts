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
import { MemberLedger } from '../ledger/member-ledger.model';
import { BillingCycle } from '../billing/billing-cycle.model';
import { MemberBill } from '../billing/member-bill.model';
import { CASH_TRANSACTION_TYPES, LEDGER_TRANSACTION_TYPES } from '../../constants/ledgerEntryTypes';
import { DHAKA_OFFSET_MS, getMonthBoundariesDhaka, normalizeMealDate } from '../../shared/utils/dateUtils';
import type { CreateMessPayload, UpdateMessPayload } from './mess.validation';

// Generate a short random uppercase invite code (e.g. "A3F2B1C4")
const generateInviteCode = (): string =>
  crypto.randomBytes(4).toString('hex').toUpperCase();

const defaultSettings = {
  mealCategories: ['Breakfast', 'Lunch', 'Dinner'],
  equalShareCategories: ['rent', 'wifi', 'electricity', 'water', 'gas', 'bua'],
};

const normalizeSettings = (settings?: any, baseSettings: any = {}) => {
  const nextSettings = {
    ...defaultSettings,
    ...baseSettings,
    ...(settings || {}),
  };

  return {
    mealCategories: nextSettings.mealCategories,
    equalShareCategories: nextSettings.equalShareCategories,
  };
};

const generateUniqueInviteCode = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = generateInviteCode();
    const exists = await Mess.exists({ inviteCode });
    if (!exists) return inviteCode;
  }
  throw new AppError(500, 'Could not generate a unique invite code');
};

export const createMess = async (userId: string, payload: CreateMessPayload) => {
  const inviteCode = await generateUniqueInviteCode();

  const mess = await Mess.create({ ...payload, settings: normalizeSettings(payload.settings), inviteCode });

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

/**
 * Calculate estimated meal rate for the current month:
 * Total approved expenses ÷ Total meals eaten
 */
export const getEstimatedMealRate = async (messId: string): Promise<{ rate: number; mealExpense: number; totalMeals: number }> => {
  const messObjectId = new mongoose.Types.ObjectId(messId);

  const today = new Date();
  const dhakaToday = new Date(today.getTime() + DHAKA_OFFSET_MS);
  const { start: monthStart, end: monthEnd } = getMonthBoundariesDhaka(dhakaToday.getUTCMonth() + 1, dhakaToday.getUTCFullYear());

  const [mealExpenseResult, totalMealsResult] = await Promise.all([
    Expense.aggregate([
      {
        $match: {
          messId: messObjectId,
          status: 'approved',
          date: { $gte: monthStart, $lte: monthEnd },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Meal.aggregate([
      { $match: { messId: messObjectId, date: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: null, total: { $sum: '$mealCount' } } },
    ]),
  ]);

  const mealExpense = mealExpenseResult[0]?.total ?? 0;
  const totalMeals = totalMealsResult[0]?.total ?? 0;
  const rate = totalMeals > 0 ? Math.round((mealExpense / totalMeals) * 100) / 100 : 0;

  return { rate, mealExpense, totalMeals };
};

export const getDashboard = async (messId: string, messMemberId?: string) => {
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
    monthlyUtilities,
    pendingExpenses,
    unpaidUtilities,
    openComplaints,
    pendingMarketDuties,
    cashSummary,
    recentNotices,
    estimatedMealRate,
  ] = await (Promise.all([
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
    sumField(UtilityBill, {
      messId: messObjectId,
      billingMonth: dhakaToday.getUTCMonth() + 1,
      year: dhakaToday.getUTCFullYear(),
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
    getEstimatedMealRate(messId),
  ]) as any);

  const resolvedSubscription = subscription || (await assignDefaultSubscription(messId)).toObject();
  const plan = await SubscriptionPlan.findOne({ code: resolvedSubscription.planId }).select('name code price currency billingCycle maxMembers').lean();

  const mealBreakdown: Record<string, number> = {};
  for (const breakdown of todayMeals[0]?.breakdowns ?? []) {
    const entries = breakdown instanceof Map ? Array.from(breakdown.entries()) : Object.entries(breakdown ?? {});
    for (const [category, count] of entries) {
      mealBreakdown[category] = (mealBreakdown[category] ?? 0) + Number(count || 0);
    }
  }

  const cashIn = cashSummary.find((item: any) => item._id === CASH_TRANSACTION_TYPES.IN)?.total ?? 0;
  const cashOut = cashSummary.find((item: any) => item._id === CASH_TRANSACTION_TYPES.OUT)?.total ?? 0;

  // ─── Manager's own personal balance ──────────────────────────────
  let selfBalance = null;

  if (messMemberId) {
    const memberObjectId = new mongoose.Types.ObjectId(messMemberId);
    const myMealsCount = await Meal.aggregate([
      { $match: { messId: messObjectId, messMemberId: memberObjectId, date: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: null, total: { $sum: '$mealCount' } } },
    ]);

    const myTotalMeals = myMealsCount[0]?.total ?? 0;
    const mealRate = estimatedMealRate.rate;
    const estimatedMealCharge = myTotalMeals > 0 && mealRate > 0 ? +(myTotalMeals * mealRate).toFixed(2) : 0;

    const ledgerResult = await MemberLedger.aggregate([
      { $match: { messId: messObjectId, messMemberId: memberObjectId, isVoided: { $ne: true } } },
      {
        $group: {
          _id: null,
          totalCredits: { $sum: { $cond: [{ $eq: ['$type', LEDGER_TRANSACTION_TYPES.CREDIT] }, '$amount', 0] } },
          totalCharges: { $sum: { $cond: [{ $eq: ['$type', LEDGER_TRANSACTION_TYPES.CHARGE] }, '$amount', 0] } },
        },
      },
    ]);

    const credits = ledgerResult[0]?.totalCredits ?? 0;
    const charges = ledgerResult[0]?.totalCharges ?? 0;
    const effectiveCharges = charges + estimatedMealCharge;
    const effectiveBalance = credits - effectiveCharges;
    const finalDue = Math.max(0, -effectiveBalance);
    const finalAdvance = Math.max(0, effectiveBalance);
    const type = finalAdvance > 0 ? 'advance' : finalDue > 0 ? 'due' : 'settled';
    const amount = type === 'advance' ? finalAdvance : finalDue;

    selfBalance = { type, amount, finalDue, finalAdvance, isEstimated: estimatedMealCharge > 0, estimatedMealCharge, myMeals: myTotalMeals };
  }

  return {
    mess,
    subscription: { ...resolvedSubscription, plan },
    selfBalance,
    summary: {
      activeMembers,
      pendingJoinRequests,
      todayMeals: todayMeals[0]?.totalMeals ?? 0,
      todayMealRecords: todayMeals[0]?.records ?? 0,
      pendingPaymentsAmount: pendingPayments.amount,
      pendingPaymentsCount: pendingPayments.count,
      monthlyExpensesAmount: monthlyExpenses.amount,
      monthlyExpensesCount: monthlyExpenses.count,
      monthlyUtilitiesAmount: monthlyUtilities.amount,
      monthlyUtilitiesCount: monthlyUtilities.count,
      pendingExpensesAmount: pendingExpenses.amount,
      pendingExpensesCount: pendingExpenses.count,
      unpaidUtilities,
      openComplaints,
      pendingMarketDuties,
      totalMessFund: cashIn - cashOut,
      totalDeposits: cashIn,
      totalCashOut: cashOut,
      estimatedMealRate: estimatedMealRate.rate,
      estimatedMealExpense: estimatedMealRate.mealExpense,
      estimatedTotalMeals: estimatedMealRate.totalMeals,
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

export const getMemberDashboard = async (messId: string, messMemberId: string, messRole: string) => {
  const messObjectId = new mongoose.Types.ObjectId(messId);
  const memberObjectId = new mongoose.Types.ObjectId(messMemberId);

  const mess = await Mess.findById(messId).select('name address status settings').lean();
  if (!mess) throw new AppError(404, 'Mess not found');

  const today = normalizeMealDate(new Date());
  const dhakaToday = new Date(today.getTime() + DHAKA_OFFSET_MS);
  const { start: monthStart, end: monthEnd } = getMonthBoundariesDhaka(dhakaToday.getUTCMonth() + 1, dhakaToday.getUTCFullYear());

  const [
    subscription,
    activeCycle,
    latestBill,
    monthlyMeals,
    recentPayments,
    recentNotices,
    nextMarketDuty,
    estimatedMealRate,
  ] = await Promise.all([
    Subscription.findOne({ messId: messObjectId }).lean(),
    BillingCycle.findOne({
      messId: messObjectId,
      startDate: { $lte: today },
      endDate: { $gte: today },
    }).sort({ year: -1, month: -1 }).lean(),
    MemberBill.findOne({
      messId: messObjectId,
      messMemberId: memberObjectId,
      isArchived: false,
    }).sort({ createdAt: -1 }).lean(),
    Meal.aggregate([
      {
        $match: {
          messId: messObjectId,
          messMemberId: memberObjectId,
          date: { $gte: monthStart, $lte: monthEnd },
        },
      },
      {
        $group: {
          _id: null,
          totalMeals: { $sum: '$mealCount' },
          records: { $sum: 1 },
          breakdowns: { $push: '$meals' },
        },
      },
    ]),
    Payment.find({ messId: messObjectId, messMemberId: memberObjectId })
      .select('amount method reference status receivedDate createdAt updatedAt')
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(5)
      .lean(),
    Notice.find({ messId: messObjectId, status: 'active' })
      .select('title content isPinned createdAt')
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(3)
      .lean(),
    MarketSchedule.findOne({
      messId: messObjectId,
      assignedTo: memberObjectId,
      targetDate: { $gte: today },
      status: 'pending',
    })
      .select('targetDate shoppingItems estimatedBudget status assignedTo')
      .sort({ targetDate: 1 })
      .populate({
        path: 'assignedTo',
        select: 'userId messRole status',
        populate: { path: 'userId', select: 'fullName email phone avatarUrl' },
      })
      .lean(),
    getEstimatedMealRate(messId),
  ]);

  const resolvedSubscription = subscription || (await assignDefaultSubscription(messId)).toObject();
  const plan = await SubscriptionPlan.findOne({ code: resolvedSubscription.planId }).select('name code price currency billingCycle maxMembers features').lean();

  const mealBreakdown: Record<string, number> = {};
  for (const breakdown of monthlyMeals[0]?.breakdowns ?? []) {
    const entries = breakdown instanceof Map ? Array.from(breakdown.entries()) : Object.entries(breakdown ?? {});
    for (const [category, count] of entries) {
      mealBreakdown[category] = (mealBreakdown[category] ?? 0) + Number(count || 0);
    }
  }

  // If current billing cycle is NOT finalized (draft or missing), use running ledger balance
  // instead of showing last month's stale bill.
  // ALSO include estimated meal charges for current unbilled meals so members see a realistic balance.
  let balanceSource: 'latest_bill' | 'running_ledger' = 'latest_bill';
  let runningCredits = 0;
  let runningCharges = 0;
  let estimatedMealCharge = 0;

  if (!activeCycle || activeCycle.status === 'draft') {
    const myMealsCount = monthlyMeals[0]?.totalMeals ?? 0;
    const mealRate = estimatedMealRate.rate;
    estimatedMealCharge = myMealsCount > 0 && mealRate > 0 ? +(myMealsCount * mealRate).toFixed(2) : 0;

    const ledgerResult = await MemberLedger.aggregate([
      {
        $match: {
          messId: messObjectId,
          messMemberId: memberObjectId,
          isVoided: { $ne: true },
        },
      },
      {
        $group: {
          _id: null,
          totalCredits: {
            $sum: { $cond: [{ $eq: ['$type', LEDGER_TRANSACTION_TYPES.CREDIT] }, '$amount', 0] },
          },
          totalCharges: {
            $sum: { $cond: [{ $eq: ['$type', LEDGER_TRANSACTION_TYPES.CHARGE] }, '$amount', 0] },
          },
        },
      },
    ]);

    if (ledgerResult.length > 0) {
      runningCredits = ledgerResult[0].totalCredits;
      runningCharges = ledgerResult[0].totalCharges;
    }
    balanceSource = 'running_ledger';
  }

  const effectiveCharges = runningCharges + estimatedMealCharge;
  const effectiveBalance = runningCredits - effectiveCharges;
  const finalDue = balanceSource === 'running_ledger'
    ? Math.max(0, -effectiveBalance)
    : (latestBill?.summary?.finalDue ?? 0);
  const finalAdvance = balanceSource === 'running_ledger'
    ? Math.max(0, effectiveBalance)
    : (latestBill?.summary?.finalAdvance ?? 0);
  const balanceType = finalAdvance > 0 ? 'advance' : finalDue > 0 ? 'due' : 'settled';

  const recentActivity = [
    ...recentPayments.map((payment: any) => ({
      type: 'payment',
      title: payment.status === 'approved' ? 'Payment Approved' : payment.status === 'pending' ? 'Payment Submitted' : `Payment ${payment.status}`,
      description: `${payment.amount} ${payment.method} payment`,
      status: payment.status,
      amount: payment.amount,
      createdAt: payment.updatedAt ?? payment.createdAt,
      refId: payment._id,
    })),
    ...recentNotices.map((notice: any) => ({
      type: 'notice',
      title: 'New Notice Posted',
      description: notice.title,
      isPinned: notice.isPinned,
      createdAt: notice.createdAt,
      refId: notice._id,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt as Date).getTime() - new Date(a.createdAt as Date).getTime())
    .slice(0, 6);

  return {
    mess,
    subscription: { ...resolvedSubscription, plan },
    member: {
      _id: messMemberId,
      role: messRole,
    },
    billing: {
      activeCycle,
      latestBill,
      balance: {
        type: balanceType,
        amount: balanceType === 'advance' ? finalAdvance : finalDue,
        finalDue,
        finalAdvance,
        source: balanceSource,
        isEstimated: balanceSource === 'running_ledger' && estimatedMealCharge > 0,
        estimatedMealCharge,
        status: latestBill?.status ?? null,
        updatedAt: (latestBill as any)?.updatedAt ?? null,
      },
    },
    meals: {
      month: dhakaToday.getUTCMonth() + 1,
      year: dhakaToday.getUTCFullYear(),
      total: monthlyMeals[0]?.totalMeals ?? 0,
      records: monthlyMeals[0]?.records ?? 0,
      breakdown: mealBreakdown,
      estimatedMealRate: estimatedMealRate.rate,
      estimatedMealExpense: estimatedMealRate.mealExpense,
      estimatedTotalMeals: estimatedMealRate.totalMeals,
    },
    marketDuty: {
      next: nextMarketDuty,
    },
    recent: {
      activity: recentActivity,
      payments: recentPayments,
      notices: recentNotices,
    },
    quickLinks: {
      myBill: Boolean(latestBill),
      submitPayment: true,
      requestMealOff: true,
      myMeals: true,
      notices: true,
      complaints: Boolean(plan?.features?.complaints),
    },
  };
};

export const updateMess = async (messId: string, payload: UpdateMessPayload) => {
  const existing = await Mess.findById(messId);
  if (!existing) throw new AppError(404, 'Mess not found');

  const updatePayload = {
    ...payload,
    ...(payload.settings ? { settings: normalizeSettings(payload.settings, existing.settings || {}) } : {}),
  };

  const mess = await Mess.findByIdAndUpdate(messId, updatePayload, { new: true, runValidators: true });
  if (!mess) throw new AppError(404, 'Mess not found');
  return mess;
};

export const regenerateInviteCode = async (messId: string) => {
  const inviteCode = await generateUniqueInviteCode();
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
