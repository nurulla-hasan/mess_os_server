import mongoose from 'mongoose';
import { Subscription } from './subscription.model';
import { SubscriptionHistory } from './subscription-history.model';
import { AppError } from '../../shared/utils/apiError';
import { paymentGateway } from '../../shared/services/paymentGateway';

const AVAILABLE_PLANS = [
  { id: 'free_trial', name: '7-Day Free Trial', price: 0, durationDays: 7 },
  { id: 'pro_monthly', name: 'Pro Monthly', price: 10, durationDays: 30 }
];

export const getAvailablePlans = async () => AVAILABLE_PLANS;

export const getCurrentPlan = async (messId: string) => {
  return await Subscription.findOne({ messId });
};

export const startTrial = async (messId: string) => {
  const existing = await Subscription.findOne({ messId });
  if (existing) throw new AppError(400, 'Trial or subscription already historically bound to this mess');

  const start = new Date();
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

  const sub = await Subscription.create({
    messId,
    planId: 'free_trial',
    status: 'trialing',
    currentPeriodStart: start,
    currentPeriodEnd: end
  });

  await SubscriptionHistory.create({ messId, planId: 'free_trial', action: 'trial_started' });
  return sub;
};

export const subscribePlan = async (messId: string, planId: string, paymentToken: string) => {
  const plan = AVAILABLE_PLANS.find(p => p.id === planId);
  if (!plan) throw new AppError(400, 'Invalid plan mapping ID');
  
  if (planId === 'free_trial') throw new AppError(400, 'Free trial securely walled. Trigger organically through trial initialization bound explicitly.');

  const paymentResult = await paymentGateway.chargeTokens(paymentToken, plan.price);
  if (!paymentResult.success) {
     await SubscriptionHistory.create({ messId, planId, action: 'payment_failed', note: paymentResult.error, amount: plan.price });
     throw new AppError(402, paymentResult.error || 'Payment failed securely propagating error from external gateway boundary');
  }

  const start = new Date();
  const end = new Date(start.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

  await SubscriptionHistory.create({ messId, planId, action: 'subscribed', amount: plan.price });

  const existing = await Subscription.findOne({ messId });
  if (existing) {
     existing.planId = planId;
     existing.status = 'active';
     existing.currentPeriodStart = start;
     existing.currentPeriodEnd = end;
     existing.cancelAtPeriodEnd = false;
     return await existing.save();
  }

  return await Subscription.create({
    messId,
    planId,
    status: 'active',
    currentPeriodStart: start,
    currentPeriodEnd: end
  });
};

export const cancelSubscription = async (messId: string) => {
  const existing = await Subscription.findOne({ messId });
  if (!existing || existing.status === 'canceled') throw new AppError(400, 'No active subscription bound securely to this identifier');
  
  existing.cancelAtPeriodEnd = true;
  await existing.save();
  
  await SubscriptionHistory.create({ messId, planId: existing.planId, action: 'canceled' });
  return existing;
};

export const getSubscriptionHistory = async (messId: string) => {
  return await SubscriptionHistory.find({ messId }).sort({ createdAt: -1 }); 
};
