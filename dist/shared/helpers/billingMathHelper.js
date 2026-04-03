"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingMathHelper = void 0;
const mathUtils_1 = require("../utils/mathUtils");
exports.billingMathHelper = {
    calculateMealRate(totalMealExpense, totalMeals) {
        return (0, mathUtils_1.safeDivide)(totalMealExpense, totalMeals);
    },
    calculateProratedShare(totalExpense, activeDays, totalDaysInMonth) {
        const fraction = (0, mathUtils_1.safeDivide)(activeDays, totalDaysInMonth);
        return (0, mathUtils_1.roundTo)(totalExpense * fraction);
    }
};
