import { BillingCycle } from './billing-cycle.model';
import { AppError } from '../../shared/utils/apiError';
import { getMonthBoundariesDhaka, getTodayDhakaNormalized, normalizeMealDate } from '../../shared/utils/dateUtils';

const getDhakaMonthYear = (date: Date | string) => {
  const normalized = normalizeMealDate(date);
  const dhakaDate = new Date(normalized.getTime() + 6 * 60 * 60 * 1000);
  return {
    month: dhakaDate.getUTCMonth() + 1,
    year: dhakaDate.getUTCFullYear(),
  };
};

export const assertBillingCycleOpenForDate = async (
  messId: string,
  date: Date | string,
  message = 'This month is finalized. Reopen billing before changing records.'
) => {
  const { month, year } = getDhakaMonthYear(date);
  const finalizedCycle = await BillingCycle.findOne({ messId, month, year, status: 'finalized' }).select('_id').lean();
  if (finalizedCycle) throw new AppError(400, message);
};

export const assertBillingCycleOpenForMonth = async (
  messId: string,
  month: number,
  year: number,
  message = 'This billing cycle is finalized. Reopen billing before changing records.'
) => {
  const finalizedCycle = await BillingCycle.findOne({ messId, month, year, status: 'finalized' }).select('_id').lean();
  if (finalizedCycle) throw new AppError(400, message);
};

export const assertBillingPeriodReadyToFinalize = (month: number, year: number) => {
  const { end } = getMonthBoundariesDhaka(month, year);
  if (end >= getTodayDhakaNormalized()) {
    throw new AppError(400, 'Cannot finalize an active or future billing month');
  }
};
