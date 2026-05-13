require('dotenv').config();

const mongoose = require('mongoose');
const { BillingCycle } = require('../dist/modules/billing/billing-cycle.model');
const { MemberBill } = require('../dist/modules/billing/member-bill.model');
const { MessMember } = require('../dist/modules/mess-member/mess-member.model');
const { Mess } = require('../dist/modules/mess/mess.model');
const { User } = require('../dist/modules/user/user.model');

const uri = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/mess_os_local';

async function seedMess(mess) {
  if (!mess) throw new Error('No active mess found. Create/select a mess first.');

  const members = await MessMember.find({ messId: mess._id, status: 'active' })
    .sort({ messRole: -1, createdAt: 1 })
    .lean();

  if (!members.length) throw new Error(`No active members found for mess ${mess._id}`);

  const users = await User.find({ _id: { $in: members.map((member) => member.userId) } })
    .select('fullName email phone')
    .lean();
  const userById = new Map(users.map((user) => [String(user._id), user]));

  const month = Number(process.env.SEED_BILLING_MONTH || 5);
  const year = Number(process.env.SEED_BILLING_YEAR || 2026);
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0) - 6 * 60 * 60 * 1000);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endDate = new Date(Date.UTC(nextYear, nextMonth - 1, 1, 0, 0, 0, 0) - 6 * 60 * 60 * 1000 - 1);

  const cycle = await BillingCycle.findOneAndUpdate(
    { messId: mess._id, month, year },
    {
      messId: mess._id,
      month,
      year,
      startDate,
      endDate,
      status: 'finalized',
      summary: {
        totalMeals: 0,
        totalMealExpense: 0,
        totalEqualShareExpense: 0,
        mealRate: 0,
      },
      finalizedAt: new Date(),
      finalizedBy: members[0].userId,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  let totalMeals = 0;
  let totalMealExpense = 0;
  let totalEqualShareExpense = 0;
  const mealRate = 80;
  const equalSharePerMember = 1200;

  const billDocs = members.slice(0, 8).map((member, index) => {
    const participatesInMeals = member.participation?.meals !== false;
    const participatesInSharedExpenses = member.participation?.sharedExpenses !== false;
    const meals = participatesInMeals ? Math.max(0, 72 - index * 4) : 0;
    const mealCharge = meals * mealRate;
    const equalShare = participatesInSharedExpenses ? equalSharePerMember : 0;
    const previousDue = index % 3 === 0 ? 500 : 0;
    const totalPaymentsAndCredits = index % 2 === 0 ? 3000 : 1500;
    const finalPayable = mealCharge + equalShare;
    const balance = previousDue + finalPayable - totalPaymentsAndCredits;
    const finalDue = balance > 0 ? balance : 0;
    const finalAdvance = balance < 0 ? Math.abs(balance) : 0;

    totalMeals += meals;
    totalMealExpense += mealCharge;
    totalEqualShareExpense += equalShare;

    return {
      messId: mess._id,
      billingCycleId: cycle._id,
      messMemberId: member._id,
      summary: {
        meals,
        mealRate,
        mealCharge,
        equalShare,
        previousDue,
        totalPaymentsAndCredits,
        finalPayable,
        finalDue,
        finalAdvance,
      },
      status: finalDue > 0 ? 'unpaid' : 'settled',
      isArchived: false,
      memberName: userById.get(String(member.userId))?.fullName || String(member._id),
    };
  });

  await BillingCycle.findByIdAndUpdate(cycle._id, {
    summary: {
      totalMeals,
      totalMealExpense,
      totalEqualShareExpense,
      mealRate,
    },
  });

  for (const bill of billDocs) {
    const { memberName, ...doc } = bill;
    await MemberBill.findOneAndUpdate(
      { billingCycleId: cycle._id, messMemberId: bill.messMemberId, isArchived: false },
      doc,
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  const freshCycle = await BillingCycle.findById(cycle._id).lean();
  const billCount = await MemberBill.countDocuments({ billingCycleId: cycle._id, isArchived: false });

  console.log(JSON.stringify({
    messId: String(mess._id),
    messName: mess.name,
    billingCycleId: String(cycle._id),
    month,
    year,
    memberBills: billCount,
    summary: freshCycle.summary,
    sampleMembers: billDocs.slice(0, 5).map((bill) => ({
      memberName: bill.memberName,
      messMemberId: String(bill.messMemberId),
      finalDue: bill.summary.finalDue,
      finalAdvance: bill.summary.finalAdvance,
    })),
  }, null, 2));
}

async function main() {
  await mongoose.connect(uri);

  const messes = process.env.SEED_MESS_ID
    ? [await Mess.findById(process.env.SEED_MESS_ID).lean()]
    : await Mess.find({ status: 'active' }).sort({ updatedAt: -1 }).lean();

  if (!messes.length || !messes[0]) throw new Error('No active mess found. Create/select a mess first.');

  for (const mess of messes) {
    try {
      await seedMess(mess);
    } catch (error) {
      console.error(`Skipped mess ${mess?._id}: ${error.message}`);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
