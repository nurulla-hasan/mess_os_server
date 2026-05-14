import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/apiError';
import { Subscription } from '../../modules/subscription/subscription.model';
import { SubscriptionPlan, SubscriptionFeatureKey } from '../../modules/subscription/subscription-plan.model';
import { assignDefaultSubscription } from '../../modules/subscription/subscription.service';

const featureLabels: Record<SubscriptionFeatureKey, string> = {
  meals: 'Meals',
  expenses: 'Expenses',
  billing: 'Billing',
  reports: 'Reports',
  marketSchedule: 'Market Schedule',
  aiShopping: 'AI Shopping',
  notices: 'Notices',
  complaints: 'Complaints',
  prioritySupport: 'Priority Support',
};

export const requireSubscriptionFeature = (feature: SubscriptionFeatureKey) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.globalRole === 'super_admin') return next();
    if (!req.messId) return next(new AppError(400, 'Mess context is required'));

    const subscription = (await Subscription.findOne({ messId: req.messId }).lean()) || (await assignDefaultSubscription(req.messId)).toObject();
    if (subscription.status !== 'active') {
      return next(new AppError(402, 'Your mess subscription is not active. Please update your subscription.'));
    }

    const plan = await SubscriptionPlan.findOne({ code: subscription.planId, isActive: true }).lean();
    if (!plan) return next(new AppError(402, 'Your current subscription plan is unavailable. Please choose a plan.'));

    if (plan.features?.[feature] !== true) {
      return next(new AppError(402, `Your current plan does not include ${featureLabels[feature]}. Please upgrade.`));
    }

    next();
  } catch (error) {
    next(error);
  }
};

