import mongoose, { ClientSession } from 'mongoose';
import { BillingCycle } from './billing-cycle.model';
import { MemberBill } from './member-bill.model';
import { Expense } from '../expense/expense.model';
import { UtilityBill } from '../utility-bill/utility-bill.model';
import { Meal } from '../meal/meal.model';
import { MessMember } from '../mess-member/mess-member.model';
import { MemberLedger } from '../ledger/member-ledger.model';
import { Mess } from '../mess/mess.model';
import { ledgerHelper } from '../../shared/helpers/ledgerHelper';
import { billingMathHelper } from '../../shared/helpers/billingMathHelper';
import { getMonthBoundariesDhaka, DHAKA_OFFSET_MS } from '../../shared/utils/dateUtils';
import { AppError } from '../../shared/utils/apiError';
import { REFERENCE_TYPES, LEDGER_TRANSACTION_TYPES } from '../../constants/ledgerEntryTypes';

export const getBillingCycles = async (messId: string) => {
  return await BillingCycle.find({ messId }).sort({ year: -1, month: -1 });
};

export const getMemberBills = async (messId: string, cycleId: string) => {
  return await MemberBill.find({ messId, billingCycleId: cycleId }).sort({ isArchived: 1, createdAt: -1 });
};

const generateBillingPayload = async (messId: string, billingMonth: number, billingYear: number, session?: ClientSession) => {
    const { start, end } = getMonthBoundariesDhaka(billingMonth, billingYear);

    const messQuery = session ? Mess.findById(messId).session(session) : Mess.findById(messId);
    const mess = await messQuery;
    if (!mess) throw new AppError(404, 'Mess not found');

    const mealCategories = mess.settings.mealCategories || [];
    const equalShareCategories = mess.settings.equalShareCategories || [];

    const expensesQuery = Expense.find({ messId, status: 'approved', date: { $gte: start, $lte: end } });
    const utilityBillsQuery = UtilityBill.find({ messId, status: 'paid', billingMonth: billingMonth, year: billingYear });
    
    const expenses = session ? await expensesQuery.session(session) : await expensesQuery;
    const utilityBills = session ? await utilityBillsQuery.session(session) : await utilityBillsQuery;

    let totalMealExpense = 0;
    let totalEqualShareExpense = 0;

    expenses.forEach(e => {
      if (mealCategories.includes(e.category)) totalMealExpense += e.amount;
      else if (equalShareCategories.includes(e.category)) totalEqualShareExpense += e.amount;
    });

    utilityBills.forEach(b => {
      if (equalShareCategories.includes(b.category)) totalEqualShareExpense += b.amount;
    });

    const mealAggQuery = Meal.aggregate([
      { $match: { messId: new mongoose.Types.ObjectId(messId), date: { $gte: start, $lte: end } } },
      { $group: { _id: '$messMemberId', totalCount: { $sum: '$mealCount' } } }
    ]);
    const mealsAgg = session ? await mealAggQuery.session(session) : await mealAggQuery;

    const totalMeals = mealsAgg.reduce((sum, m) => sum + m.totalCount, 0);
    const mealRate = billingMathHelper.calculateMealRate(totalMealExpense, totalMeals);

    const membersQuery = MessMember.find({ messId, joinedAt: { $lte: end } });
    const members = session ? await membersQuery.session(session) : await membersQuery;

    const validMembersForShare = members.filter(m => m.status === 'active' || (m.leftAt && m.leftAt >= start));

    const totalDaysInMonth = new Date(end.getTime() + DHAKA_OFFSET_MS).getUTCDate();
    let totalShareUnits = 0;
    
    const memberShares = validMembersForShare.map(m => {
       const joined = m.joinedAt > start ? m.joinedAt : start;
       const left = m.leftAt && m.leftAt < end ? m.leftAt : end;
       const activeDays = Math.max(0, (left.getTime() - joined.getTime()) / (1000 * 3600 * 24));
       const unit = Number(totalDaysInMonth > 0 ? (activeDays / totalDaysInMonth).toFixed(2) : 0);
       totalShareUnits += unit;
       return { memberId: m._id, unit };
    });

    const equalizeMultiplier = totalShareUnits > 0 ? 1 / totalShareUnits : 0;
    
    const memberBills = [];
    const memberCharges = [];

    const ledgersQuery = MemberLedger.find({ messId, isVoided: false, date: { $lte: end } });
    const ledgers = session ? await ledgersQuery.session(session) : await ledgersQuery;

    for (const m of validMembersForShare) {
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

       const mealData = mealsAgg.find(meal => meal._id.toString() === mIdStr);
       const personalMealCount = mealData ? mealData.totalCount : 0;
       const personalMealCharge = Number((personalMealCount * mealRate).toFixed(2));

       const shareObj = memberShares.find(sh => sh.memberId.toString() === mIdStr);
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
    const existingCycle = await BillingCycle.findOne({ messId, month: billingMonth, year: billingYear }).session(session);
    if (existingCycle && existingCycle.status === 'finalized') {
      throw new AppError(400, 'Billing cycle already finalized');
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
    
    return { success: true, message: 'Billing cycle cleanly reopened, math reversed from ledgers' };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};
