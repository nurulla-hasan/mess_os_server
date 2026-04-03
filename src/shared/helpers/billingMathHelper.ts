import { roundTo, safeDivide } from '../utils/mathUtils';

export const billingMathHelper = {
  calculateMealRate(totalMealExpense: number, totalMeals: number): number {
    return safeDivide(totalMealExpense, totalMeals); 
  },
  
  calculateProratedShare(totalExpense: number, activeDays: number, totalDaysInMonth: number): number {
    const fraction = safeDivide(activeDays, totalDaysInMonth);
    return roundTo(totalExpense * fraction);
  }
};
