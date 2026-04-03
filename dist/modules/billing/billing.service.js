"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reopenBillingCycle = exports.finalizeBillingCycle = exports.previewBillingCycle = exports.getMemberBills = exports.getBillingCycles = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const billing_cycle_model_1 = require("./billing-cycle.model");
const member_bill_model_1 = require("./member-bill.model");
const expense_model_1 = require("../expense/expense.model");
const utility_bill_model_1 = require("../utility-bill/utility-bill.model");
const meal_model_1 = require("../meal/meal.model");
const mess_member_model_1 = require("../mess-member/mess-member.model");
const member_ledger_model_1 = require("../ledger/member-ledger.model");
const mess_model_1 = require("../mess/mess.model");
const ledgerHelper_1 = require("../../shared/helpers/ledgerHelper");
const billingMathHelper_1 = require("../../shared/helpers/billingMathHelper");
const dateUtils_1 = require("../../shared/utils/dateUtils");
const apiError_1 = require("../../shared/utils/apiError");
const ledgerEntryTypes_1 = require("../../constants/ledgerEntryTypes");
const getBillingCycles = async (messId) => {
    return await billing_cycle_model_1.BillingCycle.find({ messId }).sort({ year: -1, month: -1 });
};
exports.getBillingCycles = getBillingCycles;
const getMemberBills = async (messId, cycleId) => {
    return await member_bill_model_1.MemberBill.find({ messId, billingCycleId: cycleId }).sort({ isArchived: 1, createdAt: -1 });
};
exports.getMemberBills = getMemberBills;
const generateBillingPayload = async (messId, billingMonth, billingYear, session) => {
    const { start, end } = (0, dateUtils_1.getMonthBoundariesDhaka)(billingMonth, billingYear);
    const messQuery = session ? mess_model_1.Mess.findById(messId).session(session) : mess_model_1.Mess.findById(messId);
    const mess = await messQuery;
    if (!mess)
        throw new apiError_1.AppError(404, 'Mess not found');
    const mealCategories = mess.settings.mealCategories || [];
    const equalShareCategories = mess.settings.equalShareCategories || [];
    const expensesQuery = expense_model_1.Expense.find({ messId, status: 'approved', date: { $gte: start, $lte: end } });
    const utilityBillsQuery = utility_bill_model_1.UtilityBill.find({ messId, status: 'paid', billingMonth: billingMonth, year: billingYear });
    const expenses = session ? await expensesQuery.session(session) : await expensesQuery;
    const utilityBills = session ? await utilityBillsQuery.session(session) : await utilityBillsQuery;
    let totalMealExpense = 0;
    let totalEqualShareExpense = 0;
    expenses.forEach(e => {
        if (mealCategories.includes(e.category))
            totalMealExpense += e.amount;
        else if (equalShareCategories.includes(e.category))
            totalEqualShareExpense += e.amount;
    });
    utilityBills.forEach(b => {
        if (equalShareCategories.includes(b.category))
            totalEqualShareExpense += b.amount;
    });
    const mealAggQuery = meal_model_1.Meal.aggregate([
        { $match: { messId: new mongoose_1.default.Types.ObjectId(messId), date: { $gte: start, $lte: end } } },
        { $group: { _id: '$messMemberId', totalCount: { $sum: '$mealCount' } } }
    ]);
    const mealsAgg = session ? await mealAggQuery.session(session) : await mealAggQuery;
    const totalMeals = mealsAgg.reduce((sum, m) => sum + m.totalCount, 0);
    const mealRate = billingMathHelper_1.billingMathHelper.calculateMealRate(totalMealExpense, totalMeals);
    const membersQuery = mess_member_model_1.MessMember.find({ messId, joinedAt: { $lte: end } });
    const members = session ? await membersQuery.session(session) : await membersQuery;
    const validMembersForShare = members.filter(m => m.status === 'active' || (m.leftAt && m.leftAt >= start));
    const totalDaysInMonth = new Date(end.getTime() + dateUtils_1.DHAKA_OFFSET_MS).getUTCDate();
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
    const ledgersQuery = member_ledger_model_1.MemberLedger.find({ messId, isVoided: false, date: { $lte: end } });
    const ledgers = session ? await ledgersQuery.session(session) : await ledgersQuery;
    for (const m of validMembersForShare) {
        const mIdStr = m._id.toString();
        let chargesBeforeStart = 0;
        let creditsBeforeStart = 0;
        let creditsDuringMonth = 0;
        let chargesDuringMonth = 0;
        ledgers.filter(l => l.messMemberId.toString() === mIdStr).forEach(l => {
            if (l.date < start) {
                if (l.type === ledgerEntryTypes_1.LEDGER_TRANSACTION_TYPES.CHARGE)
                    chargesBeforeStart += l.amount;
                if (l.type === ledgerEntryTypes_1.LEDGER_TRANSACTION_TYPES.CREDIT)
                    creditsBeforeStart += l.amount;
            }
            else {
                if (l.type === ledgerEntryTypes_1.LEDGER_TRANSACTION_TYPES.CHARGE)
                    chargesDuringMonth += l.amount;
                if (l.type === ledgerEntryTypes_1.LEDGER_TRANSACTION_TYPES.CREDIT)
                    creditsDuringMonth += l.amount;
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
const previewBillingCycle = async (messId, billingMonth, billingYear) => {
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
exports.previewBillingCycle = previewBillingCycle;
const finalizeBillingCycle = async (messId, billingMonth, billingYear, finalizerUserId) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const existingCycle = await billing_cycle_model_1.BillingCycle.findOne({ messId, month: billingMonth, year: billingYear }).session(session);
        if (existingCycle && existingCycle.status === 'finalized') {
            throw new apiError_1.AppError(400, 'Billing cycle already finalized');
        }
        const { start, end, totalMeals, totalMealExpense, totalEqualShareExpense, mealRate, memberBills, memberCharges } = await generateBillingPayload(messId, billingMonth, billingYear, session);
        const cycleId = existingCycle ? existingCycle._id : new mongoose_1.default.Types.ObjectId();
        if (!existingCycle) {
            await billing_cycle_model_1.BillingCycle.create([{
                    _id: cycleId,
                    messId,
                    month: billingMonth,
                    year: billingYear,
                    startDate: start,
                    endDate: end,
                    summary: { totalMeals, totalMealExpense, totalEqualShareExpense, mealRate },
                    status: 'finalized',
                    finalizedAt: new Date(),
                    finalizedBy: new mongoose_1.default.Types.ObjectId(finalizerUserId)
                }], { session });
        }
        else {
            await billing_cycle_model_1.BillingCycle.findByIdAndUpdate(cycleId, {
                summary: { totalMeals, totalMealExpense, totalEqualShareExpense, mealRate },
                status: 'finalized',
                finalizedAt: new Date(),
                finalizedBy: new mongoose_1.default.Types.ObjectId(finalizerUserId)
            }, { session });
        }
        const linkedMemberBills = memberBills.map(mb => ({ ...mb, billingCycleId: cycleId }));
        await member_bill_model_1.MemberBill.insertMany(linkedMemberBills, { session });
        // Ledger entries are bound accurately
        const linkedMemberCharges = memberCharges.map(mc => ({
            ...mc,
            referenceType: ledgerEntryTypes_1.REFERENCE_TYPES.BILLING_CYCLE,
            referenceId: cycleId
        }));
        await ledgerHelper_1.ledgerHelper.bulkCreateMemberCharges(linkedMemberCharges, session);
        await session.commitTransaction();
        return await billing_cycle_model_1.BillingCycle.findById(cycleId);
    }
    catch (err) {
        await session.abortTransaction();
        throw err;
    }
    finally {
        session.endSession();
    }
};
exports.finalizeBillingCycle = finalizeBillingCycle;
const reopenBillingCycle = async (messId, billingCycleId) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const cycle = await billing_cycle_model_1.BillingCycle.findOne({ _id: billingCycleId, messId, status: 'finalized' }).session(session);
        if (!cycle)
            throw new apiError_1.AppError(404, 'Finalized billing cycle not found');
        // Make old state draft safely.
        // 'draft' status implies that underlying documents are mutable again and calculations are unlocked.
        cycle.status = 'draft';
        await cycle.save({ session });
        await member_bill_model_1.MemberBill.updateMany({ billingCycleId }, { isArchived: true }, { session });
        await ledgerHelper_1.ledgerHelper.voidMemberEntriesByReference(billingCycleId.toString(), ledgerEntryTypes_1.REFERENCE_TYPES.BILLING_CYCLE, session);
        await session.commitTransaction();
        return { success: true, message: 'Billing cycle cleanly reopened, math reversed from ledgers' };
    }
    catch (err) {
        await session.abortTransaction();
        throw err;
    }
    finally {
        session.endSession();
    }
};
exports.reopenBillingCycle = reopenBillingCycle;
