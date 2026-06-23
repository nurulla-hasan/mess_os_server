import mongoose, { ClientSession } from 'mongoose';
import { BillingCycle } from './billing-cycle.model';
import { MemberBill } from './member-bill.model';
import { Expense } from '../expense/expense.model';
import { Payment } from '../payment/payment.model';
import { UtilityBill } from '../utility-bill/utility-bill.model';
import { Meal } from '../meal/meal.model';
import { MessMember } from '../mess-member/mess-member.model';
import { MemberLedger } from '../ledger/member-ledger.model';
import { Mess } from '../mess/mess.model';
import '../user/user.model';
import { ledgerHelper } from '../../shared/helpers/ledgerHelper';
import { billingMathHelper } from '../../shared/helpers/billingMathHelper';
import { getMonthBoundariesDhaka, DHAKA_OFFSET_MS } from '../../shared/utils/dateUtils';
import { AppError } from '../../shared/utils/apiError';
import { REFERENCE_TYPES, LEDGER_TRANSACTION_TYPES, FUND_SOURCES } from '../../constants/ledgerEntryTypes';
import { assertBillingPeriodReadyToFinalize } from './billing-lock.service';

export const getBillingCycles = async (messId: string) => {
  return await BillingCycle.find({ messId }).sort({ year: -1, month: -1 });
};

const memberBillPopulate = {
  path: 'messMemberId',
  select: 'userId messRole status participation joinedAt leftAt',
  populate: { path: 'userId', select: 'fullName email phone avatarUrl' },
};

const normalizeMemberBill = (bill: Record<string, unknown>): Record<string, unknown> => {
  const member = bill.messMemberId as Record<string, unknown> | undefined;
  if (!member?.userId) return bill;
  const { userId, ...rest } = member;
  return { ...bill, messMemberId: { ...rest, user: userId } };
};

export const getMemberBills = async (messId: string, cycleId: string, memberId?: string, includeHistory = false) => {
  const filter: Record<string, unknown> = { messId, billingCycleId: cycleId };
  if (!includeHistory) filter.isArchived = false;
  if (memberId) filter.messMemberId = memberId;
  const bills = await MemberBill.find(filter)
    .populate(memberBillPopulate)
    .sort({ isArchived: 1, createdAt: -1 })
    .lean();
  return bills.map(normalizeMemberBill);
};

const categorizeExpenses = (
  expenses: Array<{ category: string; amount: number }>,
  utilityBills: Array<{ category: string; amount: number }>,
  mealCategories: string[],
  equalShareCategories: string[],
): { totalMealExpense: number; totalEqualShareExpense: number } => {
  let totalMealExpense = 0;
  let totalEqualShareExpense = 0;

  for (const e of expenses) {
    if (mealCategories.includes(e.category)) totalMealExpense += e.amount;
    else if (equalShareCategories.includes(e.category)) totalEqualShareExpense += e.amount;
  }

  for (const b of utilityBills) {
    if (equalShareCategories.includes(b.category)) totalEqualShareExpense += b.amount;
  }

  return { totalMealExpense, totalEqualShareExpense };
};

const calculateMemberShares = (
  members: Array<{ _id: mongoose.Types.ObjectId; joinedAt?: Date; leftAt?: Date; participation?: { sharedExpenses?: boolean } }>,
  start: Date,
  end: Date,
  totalDaysInMonth: number,
): { memberShares: Array<{ memberId: mongoose.Types.ObjectId; unit: number }>; totalShareUnits: number } => {
  let totalShareUnits = 0;
  const memberShares = members
    .filter(m => m.participation?.sharedExpenses !== false)
    .map(m => {
      const joined = m.joinedAt! > start ? m.joinedAt! : start;
      const left = m.leftAt! && m.leftAt! < end ? m.leftAt! : end;
      const activeDays = Math.max(0, (left.getTime() - joined.getTime()) / (1000 * 3600 * 24));
      const unit = Number(totalDaysInMonth > 0 ? (activeDays / totalDaysInMonth).toFixed(2) : 0);
      totalShareUnits += unit;
      return { memberId: m._id, unit };
    });
  return { memberShares, totalShareUnits };
};

const generateBillingPayload = async (messId: string, billingMonth: number, billingYear: number, session?: ClientSession) => {
    const { start, end } = getMonthBoundariesDhaka(billingMonth, billingYear);

    const messQuery = session ? Mess.findById(messId).session(session) : Mess.findById(messId);
    const mess = await messQuery;
    if (!mess) throw new AppError(404, 'Mess not found');

    const mealCategories: string[] = mess.settings?.mealCategories ?? [];
    const equalShareCategories: string[] = mess.settings?.equalShareCategories ?? [];

    const expensesQuery = Expense.find({ messId, status: 'approved', date: { $gte: start, $lte: end } });
    const utilityBillsQuery = UtilityBill.find({ messId, status: 'paid', billingMonth: billingMonth, year: billingYear });
    
    const expenses = session ? await expensesQuery.session(session) : await expensesQuery;
    const utilityBills = session ? await utilityBillsQuery.session(session) : await utilityBillsQuery;

    const { totalMealExpense, totalEqualShareExpense } = categorizeExpenses(expenses, utilityBills, mealCategories, equalShareCategories);

    const membersQuery = MessMember.find({ messId, joinedAt: { $lte: end } });
    const members = session ? await membersQuery.session(session) : await membersQuery;

    const validMembersForBilling = members.filter(m =>
      (m.status === 'active' || (m.leftAt! && m.leftAt! >= start)) &&
      !(m.messRole === 'manager' && m.isResidentManager === false)
    );
    const mealParticipantIds = validMembersForBilling
      .filter(m => m.participation?.meals !== false)
      .map(m => m._id);

    const mealAggQuery = Meal.aggregate([
      {
        $match: {
          messId: new mongoose.Types.ObjectId(messId),
          date: { $gte: start, $lte: end },
          ...(mealParticipantIds.length ? { messMemberId: { $in: mealParticipantIds } } : { messMemberId: { $in: [] } }),
        },
      },
      { $group: { _id: '$messMemberId', totalCount: { $sum: '$mealCount' } } }
    ]);
    const mealsAgg = session ? await mealAggQuery.session(session) : await mealAggQuery;

    const totalMeals = mealsAgg.reduce((sum, m) => sum + m.totalCount, 0);
    const mealRate = billingMathHelper.calculateMealRate(totalMealExpense, totalMeals);

    const totalDaysInMonth = new Date(end.getTime() + DHAKA_OFFSET_MS).getUTCDate();
    const { memberShares, totalShareUnits } = calculateMemberShares(validMembersForBilling, start, end, totalDaysInMonth);
    const equalizeMultiplier = totalShareUnits > 0 ? 1 / totalShareUnits : 0;
    
    const memberBills = [];
    const memberCharges = [];

    const ledgersQuery = MemberLedger.find({ messId, isVoided: false, date: { $lte: end } });
    const ledgers = session ? await ledgersQuery.session(session) : await ledgersQuery;

    for (const m of validMembersForBilling) {
       const mIdStr = m._id.toString();
       
       let chargesBeforeStart = 0;
       let creditsBeforeStart = 0;
       let creditsDuringMonth = 0;
       let chargesDuringMonth = 0;

       ledgers.filter(l => l.messMemberId.toString() === mIdStr).forEach(l => {
         if (l.date < start) {
           if (l.type === LEDGER_TRANSACTION_TYPES.CHARGE) chargesBeforeStart += l.amount;
           if (l.type === LEDGER_TRANSACTION_TYPES.CREDIT) creditsBeforeStart += l.amount;
         } else {
           if (l.type === LEDGER_TRANSACTION_TYPES.CHARGE) chargesDuringMonth += l.amount;
           if (l.type === LEDGER_TRANSACTION_TYPES.CREDIT) creditsDuringMonth += l.amount;
         }
       });

       const previousDue = chargesBeforeStart - creditsBeforeStart;
       const totalPaymentsAndCredits = creditsDuringMonth;

       const participatesInMeals = m.participation?.meals !== false;
       const participatesInSharedExpenses = m.participation?.sharedExpenses !== false;

       const mealData = participatesInMeals ? mealsAgg.find(meal => meal._id.toString() === mIdStr) : undefined;
       const personalMealCount = mealData ? mealData.totalCount : 0;
       const personalMealCharge = Number((personalMealCount * mealRate).toFixed(2));

       const shareObj = participatesInSharedExpenses ? memberShares.find(sh => sh.memberId.toString() === mIdStr) : undefined;
       const personalEqualShare = Number((totalEqualShareExpense * (shareObj ? shareObj.unit * equalizeMultiplier : 0)).toFixed(2));

       const finalPayable = Number((personalMealCharge + personalEqualShare).toFixed(2));

       const netBalancePosition = previousDue + chargesDuringMonth - totalPaymentsAndCredits + finalPayable;

       const finalDue = netBalancePosition > 0 ? Number(netBalancePosition.toFixed(2)) : 0;
       const finalAdvance = netBalancePosition < 0 ? Number(Math.abs(netBalancePosition).toFixed(2)) : 0;

       memberBills.push({
         messId,
         messMemberId: m._id,
         summary: {
           meals: personalMealCount,
           mealRate,
           mealCharge: personalMealCharge,
           equalShare: personalEqualShare,
           previousDue: Number(previousDue.toFixed(2)),
           totalPaymentsAndCredits: Number(totalPaymentsAndCredits.toFixed(2)),
           finalPayable,
           finalDue,
           finalAdvance
         },
         status: 'unpaid',
         isArchived: false
       });

       memberCharges.push({
         messId,
         messMemberId: m._id,
         amount: finalPayable,
         description: `Billing charge: meals (${personalMealCount}) & equal share`,
         date: end 
       });
    }

    return { start, end, totalMeals, totalMealExpense, totalEqualShareExpense, mealRate, memberBills, memberCharges };
};

export const previewBillingCycle = async (messId: string, billingMonth: number, billingYear: number) => {
  const result = await generateBillingPayload(messId, billingMonth, billingYear);
  return {
    month: billingMonth,
    year: billingYear,
    summary: {
      totalMeals: result.totalMeals,
      totalMealExpense: result.totalMealExpense,
      totalEqualShareExpense: result.totalEqualShareExpense,
      mealRate: result.mealRate
    },
    memberBills: result.memberBills
  };
};

export const finalizeBillingCycle = async (messId: string, billingMonth: number, billingYear: number, finalizerUserId: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    assertBillingPeriodReadyToFinalize(billingMonth, billingYear);

    const existingCycle = await BillingCycle.findOne({ messId, month: billingMonth, year: billingYear }).session(session);
    if (existingCycle && existingCycle.status === 'finalized') {
      throw new AppError(400, 'Billing cycle already finalized');
    }

    const { start: periodStart, end: periodEnd } = getMonthBoundariesDhaka(billingMonth, billingYear);
    const [pendingExpenses, pendingPayments, unpaidUtilities] = await Promise.all([
      Expense.countDocuments({ messId, status: 'pending', date: { $gte: periodStart, $lte: periodEnd } }).session(session),
      Payment.countDocuments({ messId, status: 'pending', createdAt: { $gte: periodStart, $lte: periodEnd } }).session(session),
      UtilityBill.countDocuments({ messId, status: 'unpaid', billingMonth, year: billingYear }).session(session),
    ]);

    if (pendingExpenses || pendingPayments || unpaidUtilities) {
      throw new AppError(
        400,
        `Cannot finalize billing with unresolved records: ${pendingExpenses} pending expenses, ${pendingPayments} pending payments, ${unpaidUtilities} unpaid utility bills`
      );
    }

    const { start, end, totalMeals, totalMealExpense, totalEqualShareExpense, mealRate, memberBills, memberCharges } = await generateBillingPayload(messId, billingMonth, billingYear, session);
    const cycleId = existingCycle ? existingCycle._id : new mongoose.Types.ObjectId();

    if (!existingCycle) {
      await BillingCycle.create([{
        _id: cycleId,
        messId,
        month: billingMonth,
        year: billingYear,
        startDate: start,
        endDate: end,
        summary: { totalMeals, totalMealExpense, totalEqualShareExpense, mealRate },
        status: 'finalized',
        finalizedAt: new Date(),
        finalizedBy: new mongoose.Types.ObjectId(finalizerUserId)
      }], { session });
    } else {
      await BillingCycle.findByIdAndUpdate(cycleId, {
        summary: { totalMeals, totalMealExpense, totalEqualShareExpense, mealRate },
        status: 'finalized',
        finalizedAt: new Date(),
        finalizedBy: new mongoose.Types.ObjectId(finalizerUserId)
      }, { session });
    }

    const linkedMemberBills = memberBills.map(mb => ({ ...mb, billingCycleId: cycleId }));
    await MemberBill.insertMany(linkedMemberBills, { session });
    
    // Ledger entries are bound accurately
    const linkedMemberCharges = memberCharges.map(mc => ({
       ...mc,
       referenceType: REFERENCE_TYPES.BILLING_CYCLE,
       referenceId: cycleId
    }));
    await ledgerHelper.bulkCreateMemberCharges(linkedMemberCharges, session);

    await session.commitTransaction();

    // Auto-update reimbursementStatus for personal_cash expenses included in this billing
    Expense.updateMany(
      {
        messId,
        status: 'approved',
        fundSource: FUND_SOURCES.PERSONAL_CASH,
        reimbursementStatus: 'pending',
        date: { $gte: periodStart, $lte: periodEnd },
      },
      { reimbursementStatus: 'reimbursed' }
    ).catch((_err) => {
      // Non-critical: billing already finalized, reimbursement status is cosmetic
      console.error('Failed to auto-reimburse personal_cash expenses:', _err);
    });

    return await BillingCycle.findById(cycleId);
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

export const reopenBillingCycle = async (messId: string, billingCycleId: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const cycle = await BillingCycle.findOne({ _id: billingCycleId, messId, status: 'finalized' }).session(session);
    if (!cycle) throw new AppError(404, 'Finalized billing cycle not found');

    // Make old state draft safely.
    // 'draft' status implies that underlying documents are mutable again and calculations are unlocked.
    cycle.status = 'draft';
    await cycle.save({ session });

    await MemberBill.updateMany({ billingCycleId }, { isArchived: true }, { session });
    await ledgerHelper.voidMemberEntriesByReference(billingCycleId.toString(), REFERENCE_TYPES.BILLING_CYCLE, session);

    await session.commitTransaction();
    
    return { success: true, message: 'Billing cycle reopened successfully' };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};
