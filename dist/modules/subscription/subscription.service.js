"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSubscriptionHistory = exports.cancelSubscription = exports.subscribePlan = exports.startTrial = exports.getCurrentPlan = exports.getAvailablePlans = void 0;
const subscription_model_1 = require("./subscription.model");
const subscription_history_model_1 = require("./subscription-history.model");
const apiError_1 = require("../../shared/utils/apiError");
const paymentGateway_1 = require("../../shared/services/paymentGateway");
const AVAILABLE_PLANS = [
    { id: 'free_trial', name: '7-Day Free Trial', price: 0, durationDays: 7 },
    { id: 'pro_monthly', name: 'Pro Monthly', price: 10, durationDays: 30 }
];
const getAvailablePlans = async () => AVAILABLE_PLANS;
exports.getAvailablePlans = getAvailablePlans;
const getCurrentPlan = async (messId) => {
    return await subscription_model_1.Subscription.findOne({ messId });
};
exports.getCurrentPlan = getCurrentPlan;
const startTrial = async (messId) => {
    const existing = await subscription_model_1.Subscription.findOne({ messId });
    if (existing)
        throw new apiError_1.AppError(400, 'Trial or subscription already historically bound to this mess');
    const start = new Date();
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    const sub = await subscription_model_1.Subscription.create({
        messId,
        planId: 'free_trial',
        status: 'trialing',
        currentPeriodStart: start,
        currentPeriodEnd: end
    });
    await subscription_history_model_1.SubscriptionHistory.create({ messId, planId: 'free_trial', action: 'trial_started' });
    return sub;
};
exports.startTrial = startTrial;
const subscribePlan = async (messId, planId, paymentToken) => {
    const plan = AVAILABLE_PLANS.find(p => p.id === planId);
    if (!plan)
        throw new apiError_1.AppError(400, 'Invalid plan mapping ID');
    if (planId === 'free_trial')
        throw new apiError_1.AppError(400, 'Free trial securely walled. Trigger organically through trial initialization bound explicitly.');
    const paymentResult = await paymentGateway_1.paymentGateway.chargeTokens(paymentToken, plan.price);
    if (!paymentResult.success) {
        await subscription_history_model_1.SubscriptionHistory.create({ messId, planId, action: 'payment_failed', note: paymentResult.error, amount: plan.price });
        throw new apiError_1.AppError(402, paymentResult.error || 'Payment failed securely propagating error from external gateway boundary');
    }
    const start = new Date();
    const end = new Date(start.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
    await subscription_history_model_1.SubscriptionHistory.create({ messId, planId, action: 'subscribed', amount: plan.price });
    const existing = await subscription_model_1.Subscription.findOne({ messId });
    if (existing) {
        existing.planId = planId;
        existing.status = 'active';
        existing.currentPeriodStart = start;
        existing.currentPeriodEnd = end;
        existing.cancelAtPeriodEnd = false;
        return await existing.save();
    }
    return await subscription_model_1.Subscription.create({
        messId,
        planId,
        status: 'active',
        currentPeriodStart: start,
        currentPeriodEnd: end
    });
};
exports.subscribePlan = subscribePlan;
const cancelSubscription = async (messId) => {
    const existing = await subscription_model_1.Subscription.findOne({ messId });
    if (!existing || existing.status === 'canceled')
        throw new apiError_1.AppError(400, 'No active subscription bound securely to this identifier');
    existing.cancelAtPeriodEnd = true;
    await existing.save();
    await subscription_history_model_1.SubscriptionHistory.create({ messId, planId: existing.planId, action: 'canceled' });
    return existing;
};
exports.cancelSubscription = cancelSubscription;
const getSubscriptionHistory = async (messId) => {
    return await subscription_history_model_1.SubscriptionHistory.find({ messId }).sort({ createdAt: -1 });
};
exports.getSubscriptionHistory = getSubscriptionHistory;
