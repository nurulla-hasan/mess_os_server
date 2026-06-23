import mongoose from 'mongoose';
import { User } from '../user/user.model';
import { Mess } from '../mess/mess.model';
import { MessMember } from '../mess-member/mess-member.model';
import { ManagerRequest } from '../manager-request/manager-request.model';
import { Subscription } from '../subscription/subscription.model';
import { SubscriptionPlan } from '../subscription/subscription-plan.model';
import { SubscriptionHistory } from '../subscription/subscription-history.model';
import { SubscriptionPayment } from '../subscription/subscription-payment.model';
import { Meal } from '../meal/meal.model';
import { Payment } from '../payment/payment.model';
import { Expense } from '../expense/expense.model';
import { UtilityBill } from '../utility-bill/utility-bill.model';
import { MarketSchedule } from '../market-schedule/market-schedule.model';
import { MenuPlan } from '../menu-plan/menu-plan.model';
import { AiShoppingList } from '../ai-shopping/ai-shopping.model';
import { Notice } from '../notice/notice.model';
import { Complaint } from '../complaint/complaint.model';
import { MealOffRequest } from '../meal-off-request/meal-off-request.model';
import { BillingCycle } from '../billing/billing-cycle.model';
import { MemberBill } from '../billing/member-bill.model';
import { CashLedger } from '../ledger/cash-ledger.model';
import { MemberLedger } from '../ledger/member-ledger.model';
import { AppError } from '../../shared/utils/apiError';

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const getAllUsers = async (page: number, limit: number, searchTerm?: string) => {
  const query: Record<string, unknown> = {};

  if (searchTerm?.trim()) {
    const regex = new RegExp(escapeRegExp(searchTerm.trim()), 'i');
    query.$or = [
      { fullName: regex },
      { email: regex },
      { phone: regex },
      { globalRole: regex },
      { status: regex },
    ];
  }

  const [items, total] = await Promise.all([
    User.find(query).select('-passwordHash').skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }),
    User.countDocuments(query),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getAllMesses = async (page: number, limit: number, searchTerm?: string, status?: 'active' | 'suspended') => {
  const query: Record<string, unknown> = status ? { status } : {};

  if (searchTerm?.trim()) {
    const regex = new RegExp(escapeRegExp(searchTerm.trim()), 'i');
    const matchingManagers = await User.find({
      $or: [
        { fullName: regex },
        { email: regex },
        { phone: regex },
      ],
    }).select('_id').lean();

    const managerMemberships = matchingManagers.length
      ? await MessMember.find({
          userId: { $in: matchingManagers.map((user) => user._id) },
          messRole: 'manager',
          status: 'active',
        }).select('messId').lean()
      : [];

    query.$or = [
      { name: regex },
      { address: regex },
      { inviteCode: regex },
      ...(managerMemberships.length ? [{ _id: { $in: managerMemberships.map((member) => member.messId) } }] : []),
    ];
  }

  const [messes, total] = await Promise.all([
    Mess.find(query).skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }).lean(),
    Mess.countDocuments(query),
  ]);
  const managerMemberships = await MessMember.find({
    messId: { $in: messes.map((mess) => mess._id) },
    messRole: 'manager',
    status: 'active',
  })
    .populate('userId', 'fullName email phone avatarUrl globalRole status')
    .lean();

  const managerByMessId = new Map(managerMemberships.map((member) => [String(member.messId), member.userId]));
  const memberCounts = await MessMember.aggregate([
    {
      $match: {
        messId: { $in: messes.map((mess) => mess._id) },
        status: 'active',
      },
    },
    {
      $group: {
        _id: '$messId',
        count: { $sum: 1 },
      },
    },
  ]);
  const memberCountByMessId = new Map(memberCounts.map((item) => [String(item._id), item.count]));

  return {
    items: messes.map((mess) => ({
      ...mess,
      manager: managerByMessId.get(String(mess._id)) ?? null,
      memberCount: memberCountByMessId.get(String(mess._id)) ?? 0,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const updateUserRole = async (userId: string, targetRole: string) => {
  if (!['user', 'manager', 'super_admin'].includes(targetRole)) throw new AppError(400, 'Invalid platform globalRole specified');

  if (targetRole === 'user') {
    const managedMess = await MessMember.findOne({
      userId,
      messRole: 'manager',
      status: 'active',
    }).populate('messId', 'name');

    if (managedMess) {
      const messName = (managedMess.messId as { name?: string })?.name;
      throw new AppError(
        400,
        `Cannot downgrade this user while they manage an active mess${messName ? ` (${messName})` : ''}. Transfer ownership first.`
      );
    }
  }

  const user = await User.findByIdAndUpdate(userId, { globalRole: targetRole }, { new: true }).select('-passwordHash');
  if(!user) throw new AppError(404, 'User not found in global mapping');
  return user;
};

export const blockUser = async (userId: string, status: 'active' | 'blocked') => {
  if (!['active', 'blocked'].includes(status)) throw new AppError(400, 'Invalid status. Must be active or blocked');
  const user = await User.findByIdAndUpdate(userId, { status }, { new: true }).select('-passwordHash');
  if(!user) throw new AppError(404, 'User not found');
  return user;
};

export const updateMessStatus = async (messId: string, status: 'active' | 'suspended', adminId: string, suspensionNote?: string) => {
  const update = status === 'suspended'
    ? { status, suspensionNote, suspendedAt: new Date(), suspendedBy: adminId }
    : { status, $unset: { suspensionNote: '', suspendedAt: '', suspendedBy: '' } };

  const mess = await Mess.findByIdAndUpdate(messId, update, { new: true });
  if(!mess) throw new AppError(404, 'Mess not found');
  return mess;
};

export const deleteMessPermanently = async (messId: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const messObjectId = new mongoose.Types.ObjectId(messId);
    const mess = await Mess.findById(messObjectId).session(session);
    if (!mess) throw new AppError(404, 'Mess not found');

    const managerMemberships = await MessMember.find({
      messId: messObjectId,
      messRole: 'manager',
    }).select('userId').session(session).lean();
    const managerUserIds = managerMemberships.map((member) => member.userId);

    const deleteResults = await Promise.all([
      Meal.deleteMany({ messId: messObjectId }).session(session),
      MealOffRequest.deleteMany({ messId: messObjectId }).session(session),
      Payment.deleteMany({ messId: messObjectId }).session(session),
      Expense.deleteMany({ messId: messObjectId }).session(session),
      UtilityBill.deleteMany({ messId: messObjectId }).session(session),
      MarketSchedule.deleteMany({ messId: messObjectId }).session(session),
      MenuPlan.deleteMany({ messId: messObjectId }).session(session),
      AiShoppingList.deleteMany({ messId: messObjectId }).session(session),
      Notice.deleteMany({ messId: messObjectId }).session(session),
      Complaint.deleteMany({ messId: messObjectId }).session(session),
      BillingCycle.deleteMany({ messId: messObjectId }).session(session),
      MemberBill.deleteMany({ messId: messObjectId }).session(session),
      CashLedger.deleteMany({ messId: messObjectId }).session(session),
      MemberLedger.deleteMany({ messId: messObjectId }).session(session),
      Subscription.deleteMany({ messId: messObjectId }).session(session),
      SubscriptionHistory.deleteMany({ messId: messObjectId }).session(session),
      SubscriptionPayment.deleteMany({ messId: messObjectId }).session(session),
      MessMember.deleteMany({ messId: messObjectId }).session(session),
    ]);

    const deletedMess = await Mess.deleteOne({ _id: messObjectId }).session(session);

    let downgradedManagers = 0;
    let deletedManagerRequests = 0;
    if (managerUserIds.length) {
      const remainingManagerMemberships = await MessMember.find({
        userId: { $in: managerUserIds },
        messRole: 'manager',
        status: 'active',
      }).select('userId').session(session).lean();
      const usersStillManaging = new Set(remainingManagerMemberships.map((member) => String(member.userId)));
      const usersToDowngrade = managerUserIds.filter((userId) => !usersStillManaging.has(String(userId)));

      if (usersToDowngrade.length) {
        const downgradeResult = await User.updateMany(
          { _id: { $in: usersToDowngrade }, globalRole: 'manager' },
          { globalRole: 'user' },
          { session }
        );
        downgradedManagers = downgradeResult.modifiedCount;

        const requestDeleteResult = await ManagerRequest.deleteMany({
          userId: { $in: usersToDowngrade },
          status: 'approved',
        }).session(session);
        deletedManagerRequests = requestDeleteResult.deletedCount;
      }
    }

    await session.commitTransaction();

    const labels = [
      'meals',
      'mealOffRequests',
      'payments',
      'expenses',
      'utilityBills',
      'marketSchedules',
      'menuPlans',
      'aiShoppingLists',
      'notices',
      'complaints',
      'billingCycles',
      'memberBills',
      'cashLedgerEntries',
      'memberLedgerEntries',
      'subscriptions',
      'subscriptionHistory',
      'subscriptionPayments',
      'memberships',
    ];

    return {
      messId,
      messDeleted: deletedMess.deletedCount,
      downgradedManagers,
      deletedManagerRequests,
      deleted: labels.reduce<Record<string, number>>((acc, label, index) => {
        acc[label] = deleteResults[index].deletedCount ?? 0;
        return acc;
      }, {}),
    };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

export const deleteUserPermanently = async (userId: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const user = await User.findById(userObjectId).session(session);
    if (!user) throw new AppError(404, 'User not found');

    // 1. Find all active memberships for this user
    const memberships = await MessMember.find({
      userId: userObjectId,
      status: 'active',
    }).session(session).lean();

    const managerMessIds = memberships
      .filter((m) => m.messRole === 'manager')
      .map((m) => m.messId);

    const memberMessIds = memberships
      .filter((m) => m.messRole === 'member')
      .map((m) => m.messId);

    // 2. Handle manager memberships: check if sole manager → delete mess
    const messesToDelete: mongoose.Types.ObjectId[] = [];

    for (const messId of managerMessIds) {
      const otherManagersCount = await MessMember.countDocuments({
        messId,
        userId: { $ne: userObjectId },
        messRole: 'manager',
        status: 'active',
      }).session(session);

      if (otherManagersCount === 0) {
        // Sole manager → delete entire mess with all data
        messesToDelete.push(messId);
      }
    }

    // 3. Delete messes (sole manager case) — reuse cascade logic from deleteMessPermanently
    for (const messId of messesToDelete) {
      // Capture manager user IDs before deleting memberships
      const managerMemberships = await MessMember.find({
        messId,
        messRole: 'manager',
      }).select('userId').session(session).lean();
      const managerUserIds = managerMemberships.map((member) => member.userId);

      const deleteResults = await Promise.all([
        Meal.deleteMany({ messId }).session(session),
        MealOffRequest.deleteMany({ messId }).session(session),
        Payment.deleteMany({ messId }).session(session),
        Expense.deleteMany({ messId }).session(session),
        UtilityBill.deleteMany({ messId }).session(session),
        MarketSchedule.deleteMany({ messId }).session(session),
        MenuPlan.deleteMany({ messId }).session(session),
        AiShoppingList.deleteMany({ messId }).session(session),
        Notice.deleteMany({ messId }).session(session),
        Complaint.deleteMany({ messId }).session(session),
        BillingCycle.deleteMany({ messId }).session(session),
        MemberBill.deleteMany({ messId }).session(session),
        CashLedger.deleteMany({ messId }).session(session),
        MemberLedger.deleteMany({ messId }).session(session),
        Subscription.deleteMany({ messId }).session(session),
        SubscriptionHistory.deleteMany({ messId }).session(session),
        SubscriptionPayment.deleteMany({ messId }).session(session),
        MessMember.deleteMany({ messId }).session(session),
      ]);

      await Mess.deleteOne({ _id: messId }).session(session);

      // Downgrade managers who no longer manage any active mess
      if (managerUserIds.length) {
        const remainingManagerMemberships = await MessMember.find({
          userId: { $in: managerUserIds },
          messRole: 'manager',
          status: 'active',
        }).select('userId').session(session).lean();
        const usersStillManaging = new Set(remainingManagerMemberships.map((m) => String(m.userId)));
        const usersToDowngrade = managerUserIds.filter((id) => !usersStillManaging.has(String(id)));

        if (usersToDowngrade.length) {
          await User.updateMany(
            { _id: { $in: usersToDowngrade }, globalRole: 'manager' },
            { globalRole: 'user' },
            { session }
          );
        }
      }
    }

    // 4. Remove user from remaining memberships (set status to 'removed')
    const allAffectedMessIds = [...new Set([...managerMessIds, ...memberMessIds].map(String))];
    const remainingMessIds = allAffectedMessIds
      .filter((id) => !messesToDelete.some((m) => m.toString() === id))
      .map((id) => new mongoose.Types.ObjectId(id));

    if (remainingMessIds.length) {
      await MessMember.updateMany(
        {
          userId: userObjectId,
          messId: { $in: remainingMessIds },
          status: 'active',
        },
        { status: 'removed', leftAt: new Date() },
        { session }
      );
    }

    // 5. Clean up user-specific records
    await Promise.all([
      MealOffRequest.deleteMany({ userId: userObjectId }).session(session),
      Complaint.deleteMany({ userId: userObjectId }).session(session),
    ]);

    // 6. Delete the user itself
    await User.deleteOne({ _id: userObjectId }).session(session);

    await session.commitTransaction();

    return {
      userId,
      deletedMesses: messesToDelete.length,
      removedMemberships: remainingMessIds.length,
      managersDowngraded: 0, // covered inside loop
    };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

export const getAllSubscriptions = async (
  page: number,
  limit: number,
  options: {
    searchTerm?: string;
    status?: 'active' | 'past_due' | 'canceled' | 'unpaid';
    planId?: string;
  } = {}
) => {
  const query: Record<string, unknown> = {};

  if (options.status) query.status = options.status;
  if (options.planId) query.planId = options.planId.trim().toLowerCase();

  if (options.searchTerm?.trim()) {
    const regex = new RegExp(escapeRegExp(options.searchTerm.trim()), 'i');
    const [matchingMesses, matchingPlans, matchingManagers] = await Promise.all([
      Mess.find({ $or: [{ name: regex }, { address: regex }, { inviteCode: regex }] }).select('_id').lean(),
      SubscriptionPlan.find({ $or: [{ name: regex }, { code: regex }] }).select('code').lean(),
      User.find({ $or: [{ fullName: regex }, { email: regex }, { phone: regex }] }).select('_id').lean(),
    ]);

    const managerMemberships = matchingManagers.length
      ? await MessMember.find({
          userId: { $in: matchingManagers.map((user) => user._id) },
          messRole: 'manager',
          status: 'active',
        }).select('messId').lean()
      : [];

    query.$or = [
      ...(matchingMesses.length ? [{ messId: { $in: matchingMesses.map((mess) => mess._id) } }] : []),
      ...(managerMemberships.length ? [{ messId: { $in: managerMemberships.map((member) => member.messId) } }] : []),
      ...(matchingPlans.length ? [{ planId: { $in: matchingPlans.map((plan) => plan.code) } }] : []),
    ];

    if (!(query.$or as unknown[]).length) {
      return {
        items: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      };
    }
  }

  const [subscriptions, total] = await Promise.all([
    Subscription.find(query).skip((page - 1) * limit).limit(limit).sort({ updatedAt: -1 }).lean(),
    Subscription.countDocuments(query),
  ]);

  const messIds = subscriptions.map((subscription) => subscription.messId);
  const planCodes = subscriptions.map((subscription) => subscription.planId);

  const [messes, managerMemberships, plans] = await Promise.all([
    Mess.find({ _id: { $in: messIds } }).lean(),
    MessMember.find({ messId: { $in: messIds }, messRole: 'manager', status: 'active' })
      .populate('userId', 'fullName email phone avatarUrl globalRole status')
      .lean(),
    SubscriptionPlan.find({ code: { $in: planCodes } }).lean(),
  ]);

  const messById = new Map(messes.map((mess) => [String(mess._id), mess]));
  const managerByMessId = new Map(managerMemberships.map((member) => [String(member.messId), member.userId]));
  const planByCode = new Map(plans.map((plan) => [plan.code, plan]));

  return {
    items: subscriptions.map((subscription) => {
      const mess = messById.get(String(subscription.messId));
      return {
        subscription,
        mess: mess ?? null,
        manager: managerByMessId.get(String(subscription.messId)) ?? null,
        plan: planByCode.get(subscription.planId) ?? null,
      };
    }),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const buildDailyTrend = async (model: mongoose.Model<any>, dateField: string, days = 30) => {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const results = await model.aggregate([
    { $match: { [dateField]: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: `$${dateField}` } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const trends: Array<{ date: string; count: number }> = [];
  for (let i = 0; i < days; i += 1) {
    const date = new Date(since);
    date.setDate(since.getDate() + i);
    const dateKey = date.toISOString().slice(0, 10);
    const match = results.find((item: { _id: string; count: number }) => item._id === dateKey);
    trends.push({ date: dateKey, count: match ? match.count : 0 });
  }

  return trends;
};

const buildSubscriptionAnalytics = async () => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    totalSubscriptions,
    activeSubscriptions,
    statusBreakdown,
    byPlan,
    activePlans,
    recentPaymentFailures,
    recentSubscribedEvents,
  ] = await Promise.all([
    Subscription.countDocuments(),
    Subscription.countDocuments({ status: 'active' }),
    Subscription.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Subscription.aggregate([
      { $group: { _id: '$planId', count: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } } } },
      { $sort: { count: -1 } },
    ]),
    SubscriptionPlan.find({ isActive: true }).select('code name price currency billingCycle').lean(),
    SubscriptionHistory.countDocuments({ action: 'payment_failed', createdAt: { $gte: sevenDaysAgo } }),
    SubscriptionHistory.countDocuments({ action: 'subscribed', createdAt: { $gte: sevenDaysAgo } }),
  ]);

  const planByCode = new Map(activePlans.map((plan) => [plan.code, plan]));
  const byPlanWithDetails = byPlan.map((item) => {
    const plan = planByCode.get(item._id);
    return {
      planId: item._id,
      planName: plan?.name ?? item._id,
      price: plan?.price ?? 0,
      currency: plan?.currency ?? 'BDT',
      billingCycle: plan?.billingCycle ?? null,
      count: item.count,
      active: item.active,
    };
  });

  const paidActivePlans = byPlanWithDetails.filter((item) => item.price > 0 && item.active > 0);
  const estimatedMonthlyRecurringRevenue = paidActivePlans.reduce((total, item) => {
    const monthlyPrice = item.billingCycle === 'yearly' ? item.price / 12 : item.price;
    return total + (monthlyPrice * item.active);
  }, 0);

  return {
    total: totalSubscriptions,
    active: activeSubscriptions,
    paidActive: paidActivePlans.reduce((total, item) => total + item.active, 0),
    freeActive: byPlanWithDetails
      .filter((item) => item.price === 0)
      .reduce((total, item) => total + item.active, 0),
    estimatedMonthlyRecurringRevenue,
    currency: paidActivePlans[0]?.currency ?? activePlans[0]?.currency ?? 'BDT',
    byStatus: statusBreakdown.map((item) => ({ status: item._id, count: item.count })),
    byPlan: byPlanWithDetails,
    recent: {
      subscribedLast7Days: recentSubscribedEvents,
      paymentFailedLast7Days: recentPaymentFailures,
    },
  };
};

export const getPlatformStats = async () => {
  const totalUsers = await User.countDocuments();
  const totalMesses = await Mess.countDocuments();
  const suspendedMesses = await Mess.countDocuments({ status: 'suspended' });
  const activeMesses = await Mess.countDocuments({ status: 'active' });
  
  return { totalUsers, totalMesses, suspendedMesses, activeMesses };
};

export const getPlatformAnalytics = async () => {
  const [
    totalUsers,
    activeUsers,
    blockedUsers,
    totalManagers,
    activeManagers,
    blockedManagers,
    totalMesses,
    activeMesses,
    suspendedMesses,
    totalActiveMembers,
    pendingManagerRequests,
    subscriptionAnalytics,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ status: 'active' }),
    User.countDocuments({ status: 'blocked' }),
    User.countDocuments({ globalRole: 'manager' }),
    User.countDocuments({ globalRole: 'manager', status: 'active' }),
    User.countDocuments({ globalRole: 'manager', status: 'blocked' }),
    Mess.countDocuments(),
    Mess.countDocuments({ status: 'active' }),
    Mess.countDocuments({ status: 'suspended' }),
    MessMember.countDocuments({ status: 'active' }),
    ManagerRequest.countDocuments({ status: 'pending' }),
    buildSubscriptionAnalytics(),
  ]);

  const [dailyNewUsers, dailyNewMesses] = await Promise.all([
    buildDailyTrend(User, 'createdAt', 30),
    buildDailyTrend(Mess, 'createdAt', 30),
  ]);

  return {
    summary: {
      users: { total: totalUsers, active: activeUsers, blocked: blockedUsers },
      managers: { total: totalManagers, active: activeManagers, blocked: blockedManagers },
      messes: { total: totalMesses, active: activeMesses, suspended: suspendedMesses },
      members: { active: totalActiveMembers },
      subscriptions: subscriptionAnalytics,
      pendingManagerRequests,
    },
    trends: {
      dailyNewUsers,
      dailyNewMesses,
    },
    labels: {
      userGrowth: 'Daily New Users (Last 30 Days)',
      messGrowth: 'Daily New Messes (Last 30 Days)',
    }
  };
};
