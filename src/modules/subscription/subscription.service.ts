import { Subscription } from './subscription.model';
import { SubscriptionHistory } from './subscription-history.model';
import { SubscriptionPlan } from './subscription-plan.model';
import { SubscriptionPayment } from './subscription-payment.model';
import { Mess } from '../mess/mess.model';
import { User } from '../user/user.model';
import { AppError } from '../../shared/utils/apiError';
import { sslCommerzGateway } from '../../shared/services/paymentGateway';
import { config } from '../../config';

const DEFAULT_PLANS = [
  {
    name: 'Free',
    code: 'free',
    price: 0,
    currency: 'BDT',
    billingCycle: 'free',
    maxMembers: 10,
    features: {
      meals: true,
      expenses: true,
      billing: false,
      reports: false,
      marketSchedule: false,
      aiShopping: false,
      notices: true,
      complaints: true,
      prioritySupport: false,
    },
    isDefault: true,
    isActive: true,
    sortOrder: 1,
  },
  {
    name: 'Pro',
    code: 'pro',
    price: 499,
    currency: 'BDT',
    billingCycle: 'monthly',
    durationDays: 30,
    maxMembers: 50,
    features: {
      meals: true,
      expenses: true,
      billing: true,
      reports: true,
      marketSchedule: true,
      aiShopping: false,
      notices: true,
      complaints: true,
      prioritySupport: false,
    },
    isDefault: false,
    isActive: true,
    sortOrder: 2,
  },
  {
    name: 'Max',
    code: 'max',
    price: 999,
    currency: 'BDT',
    billingCycle: 'monthly',
    durationDays: 30,
    maxMembers: 100,
    features: {
      meals: true,
      expenses: true,
      billing: true,
      reports: true,
      marketSchedule: true,
      aiShopping: true,
      notices: true,
      complaints: true,
      prioritySupport: true,
    },
    isDefault: false,
    isActive: true,
    sortOrder: 3,
  },
] as const;

type PlanPayload = {
  name: string;
  code: string;
  price: number;
  currency?: string;
  billingCycle: 'free' | 'monthly' | 'yearly';
  durationDays?: number;
  maxMembers: number;
  features?: Record<string, boolean>;
  isDefault?: boolean;
  isActive?: boolean;
  sortOrder?: number;
};

type PlanUpdatePayload = Partial<PlanPayload>;

export const ensureDefaultPlans = async () => {
  const count = await SubscriptionPlan.countDocuments();
  if (count > 0) return;
  await SubscriptionPlan.insertMany(DEFAULT_PLANS);
};

const normalizeCode = (value: string) => value.trim().toLowerCase();

const getDefaultPlanOrThrow = async () => {
  await ensureDefaultPlans();
  const plan = await SubscriptionPlan.findOne({ isDefault: true, isActive: true }).sort({ sortOrder: 1 });
  if (!plan) throw new AppError(500, 'Default subscription plan is not configured');
  return plan;
};

const getPlanByCodeOrId = async (planId: string) => {
  await ensureDefaultPlans();
  const normalized = normalizeCode(planId);
  const plan = await SubscriptionPlan.findOne({
    $or: [
      { code: normalized },
      ...(planId.match(/^[a-f\d]{24}$/i) ? [{ _id: planId }] : []),
    ],
    isActive: true,
  });
  if (!plan) throw new AppError(400, 'Invalid or inactive subscription plan');
  return plan;
};

const buildPeriod = (plan: { billingCycle: string; durationDays?: number }) => {
  const start = new Date();
  const end = plan.billingCycle === 'free'
    ? undefined
    : new Date(start.getTime() + (plan.durationDays ?? 30) * 24 * 60 * 60 * 1000);
  return { start, end };
};

const buildSslCommerzUrls = () => {
  const base = config.apiBaseUrl.replace(/\/$/, '');
  return {
    successUrl: `${base}/api/v1/subscriptions/sslcommerz/success`,
    failUrl: `${base}/api/v1/subscriptions/sslcommerz/fail`,
    cancelUrl: `${base}/api/v1/subscriptions/sslcommerz/cancel`,
    ipnUrl: `${base}/api/v1/subscriptions/sslcommerz/ipn`,
  };
};

const buildTransactionId = (messId: string, planCode: string) => {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return `${config.sslcommerz.transactionPrefix}_${messId.slice(-6)}_${planCode}_${suffix}`.toUpperCase();
};

export const getAvailablePlans = async () => {
  await ensureDefaultPlans();
  return SubscriptionPlan.find({ isActive: true }).sort({ sortOrder: 1, price: 1 }).lean();
};

export const listPlansForAdmin = async () => {
  await ensureDefaultPlans();
  return SubscriptionPlan.find().sort({ sortOrder: 1, price: 1 }).lean();
};

export const createPlan = async (payload: PlanPayload) => {
  await ensureDefaultPlans();

  if (payload.isDefault) {
    await SubscriptionPlan.updateMany({}, { isDefault: false });
  }

  return SubscriptionPlan.create({
    ...payload,
    code: normalizeCode(payload.code),
    currency: payload.currency ?? 'BDT',
    isActive: payload.isActive ?? true,
  });
};

export const updatePlan = async (planId: string, payload: PlanUpdatePayload) => {
  await ensureDefaultPlans();

  const existing = await SubscriptionPlan.findById(planId);
  if (!existing) throw new AppError(404, 'Subscription plan not found');

  if (existing.isDefault && payload.isActive === false) {
    throw new AppError(400, 'Default subscription plan cannot be deactivated');
  }

  if (payload.code && normalizeCode(payload.code) !== existing.code) {
    const subscriptionCount = await Subscription.countDocuments({ planId: existing.code });
    if (subscriptionCount > 0) {
      throw new AppError(400, 'Cannot change code for a plan that is already used by subscriptions');
    }
  }

  if (payload.isDefault) {
    await SubscriptionPlan.updateMany({ _id: { $ne: planId } }, { isDefault: false });
    payload.isActive = true;
  }

  const update = {
    ...payload,
    ...(payload.code ? { code: normalizeCode(payload.code) } : {}),
  };

  const plan = await SubscriptionPlan.findByIdAndUpdate(planId, update, { new: true, runValidators: true });
  if (!plan) throw new AppError(404, 'Subscription plan not found');
  return plan;
};

export const deletePlan = async (planId: string) => {
  await ensureDefaultPlans();

  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) throw new AppError(404, 'Subscription plan not found');
  if (plan.isDefault) throw new AppError(400, 'Default subscription plan cannot be deleted');

  const subscriptionCount = await Subscription.countDocuments({ planId: plan.code });
  if (subscriptionCount > 0) {
    plan.isActive = false;
    await plan.save();
    return { deleted: false, deactivated: true, plan };
  }

  await plan.deleteOne();
  return { deleted: true, deactivated: false, plan };
};

export const getCurrentPlan = async (messId: string) => {
  const subscription = (await Subscription.findOne({ messId }).lean()) || (await assignDefaultSubscription(messId)).toObject();
  const plan = await SubscriptionPlan.findOne({ code: subscription.planId }).lean();
  return { ...subscription, plan };
};

export const assignDefaultSubscription = async (messId: string) => {
  const existing = await Subscription.findOne({ messId });
  if (existing) return existing;

  const plan = await getDefaultPlanOrThrow();
  const { start, end } = buildPeriod(plan);
  const subscription = await Subscription.create({
    messId,
    planId: plan.code,
    status: 'active',
    currentPeriodStart: start,
    currentPeriodEnd: end,
    cancelAtPeriodEnd: false,
  });

  await SubscriptionHistory.create({ messId, planId: plan.code, action: 'default_assigned', amount: 0 });
  return subscription;
};

export const startTrial = async (messId: string) => {
  return assignDefaultSubscription(messId);
};

export const subscribePlan = async (messId: string, planId: string, userId?: string) => {
  const plan = await getPlanByCodeOrId(planId);

  const { start, end } = buildPeriod(plan);

  if (plan.price > 0) {
    const [mess, user] = await Promise.all([
      Mess.findById(messId).lean(),
      userId ? User.findById(userId).lean() : null,
    ]);
    if (!mess) throw new AppError(404, 'Mess not found');
    if (!user) throw new AppError(404, 'Payment customer user not found');

    const tranId = buildTransactionId(messId, plan.code);
    const urls = buildSslCommerzUrls();
    const initResponse = await sslCommerzGateway.initiatePayment({
      tranId,
      amount: plan.price,
      currency: plan.currency,
      productName: `${plan.name} Subscription`,
      customerName: user.fullName,
      customerEmail: user.email,
      customerPhone: user.phone || '01700000000',
      customerAddress: user.address || mess.address,
      customerCity: mess.address,
      ...urls,
    });

    if (initResponse.status !== 'SUCCESS' || !initResponse.GatewayPageURL) {
      await SubscriptionHistory.create({ messId, planId: plan.code, action: 'payment_failed', note: initResponse.failedreason || 'SSLCommerz session initiation failed', amount: plan.price });
      throw new AppError(402, initResponse.failedreason || 'SSLCommerz payment session initiation failed');
    }

    await SubscriptionPayment.create({
      messId,
      planId: plan.code,
      tranId,
      amount: plan.price,
      currency: plan.currency,
      status: 'initiated',
      gatewaySessionKey: initResponse.sessionkey,
      gatewayUrl: initResponse.GatewayPageURL,
      rawInitResponse: initResponse,
    });

    return {
      paymentRequired: true,
      gateway: 'sslcommerz',
      tranId,
      sessionKey: initResponse.sessionkey,
      gatewayUrl: initResponse.GatewayPageURL,
      plan,
    };
  }

  await SubscriptionHistory.create({ messId, planId: plan.code, action: 'subscribed', amount: plan.price });

  const existing = await Subscription.findOne({ messId });
  if (existing) {
    existing.planId = plan.code;
    existing.status = 'active';
    existing.currentPeriodStart = start;
    existing.currentPeriodEnd = end;
    existing.cancelAtPeriodEnd = false;
    return existing.save();
  }

  return Subscription.create({
    messId,
    planId: plan.code,
    status: 'active',
    currentPeriodStart: start,
    currentPeriodEnd: end,
  });
};

export const validateSslCommerzPayment = async (payload: Record<string, unknown>) => {
  const valId = payload.val_id as string | undefined;
  const tranId = payload.tran_id as string | undefined;
  if (!valId || !tranId) throw new AppError(400, 'SSLCommerz validation id or transaction id is missing');

  const payment = await SubscriptionPayment.findOne({ tranId });
  if (!payment) throw new AppError(404, 'Subscription payment transaction not found');
  if (payment.status === 'validated') return payment;

  const validation = await sslCommerzGateway.validatePayment(String(valId));
  const isValid = validation.status === 'VALID' || validation.status === 'VALIDATED';
  const expectedAmount = Number(payment.amount).toFixed(2);
  const receivedAmount = Number(validation.amount).toFixed(2);

  if (!isValid || validation.tran_id !== tranId || expectedAmount !== receivedAmount || validation.currency !== payment.currency) {
    payment.status = 'failed';
    payment.valId = String(valId);
    payment.rawValidationResponse = validation;
    await payment.save();
    await SubscriptionHistory.create({ messId: payment.messId, planId: payment.planId, action: 'payment_failed', note: validation.error || validation.status || 'SSLCommerz validation failed', amount: payment.amount });
    throw new AppError(402, 'SSLCommerz payment validation failed');
  }

  const plan = await getPlanByCodeOrId(payment.planId);
  const { start, end } = buildPeriod(plan);
  const existing = await Subscription.findOne({ messId: payment.messId });
  if (existing) {
    existing.planId = plan.code;
    existing.status = 'active';
    existing.currentPeriodStart = start;
    existing.currentPeriodEnd = end;
    existing.cancelAtPeriodEnd = false;
    await existing.save();
  } else {
    await Subscription.create({
      messId: payment.messId,
      planId: plan.code,
      status: 'active',
      currentPeriodStart: start,
      currentPeriodEnd: end,
      cancelAtPeriodEnd: false,
    });
  }

  payment.status = 'validated';
  payment.valId = String(valId);
  payment.bankTranId = validation.bank_tran_id;
  payment.cardType = validation.card_type;
  payment.riskLevel = validation.risk_level;
  payment.rawValidationResponse = validation;
  await payment.save();

  await SubscriptionHistory.create({ messId: payment.messId, planId: plan.code, action: 'subscribed', amount: payment.amount, note: `SSLCommerz tran_id ${tranId}` });
  return payment;
};

export const markSslCommerzPaymentFailed = async (payload: Record<string, unknown>, status: 'failed' | 'canceled') => {
  const tranId = payload.tran_id as string | undefined;
  if (!tranId) throw new AppError(400, 'SSLCommerz transaction id is missing');

  const payment = await SubscriptionPayment.findOne({ tranId });
  if (!payment) throw new AppError(404, 'Subscription payment transaction not found');
  if (payment.status === 'validated') return payment;
  if (payment.status === 'failed' || payment.status === 'canceled') return payment;

  payment.status = status;
  payment.rawValidationResponse = payload;
  await payment.save();
  await SubscriptionHistory.create({ messId: payment.messId, planId: payment.planId, action: 'payment_failed', note: status, amount: payment.amount });
  return payment;
};

export const cancelSubscription = async (messId: string) => {
  const existing = await Subscription.findOne({ messId });
  if (!existing) throw new AppError(400, 'No subscription bound to this mess');

  const defaultPlan = await getDefaultPlanOrThrow();
  const previousPlanId = existing.planId;
  const { start, end } = buildPeriod(defaultPlan);

  existing.planId = defaultPlan.code;
  existing.status = 'active';
  existing.currentPeriodStart = start;
  existing.currentPeriodEnd = end;
  existing.cancelAtPeriodEnd = false;
  await existing.save();

  await SubscriptionHistory.create({ messId, planId: previousPlanId, action: 'canceled' });
  await SubscriptionHistory.create({ messId, planId: defaultPlan.code, action: 'fallback_to_default', amount: 0 });
  return existing;
};

export const getSubscriptionHistory = async (messId: string) => {
  return SubscriptionHistory.find({ messId }).sort({ createdAt: -1 });
};
