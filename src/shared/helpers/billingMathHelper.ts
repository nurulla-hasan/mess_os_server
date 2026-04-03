import { roundTo, safeDivide } from '../utils/mathUtils';

export const billingMathHelper = {
  calculateMealRate(totalMealExpense: number, totalMeals: number): number {
    return safeDivide(totalMealExpense, totalMeals, 0); 
  },
  
  calculateProratedShare(totalExpense: number, activeDays: number, totalDaysInMonth: number): number {
    const fraction = safeDivide(activeDays, totalDaysInMonth, 0);
    return roundTo(totalExpense * fraction);
  }
};
