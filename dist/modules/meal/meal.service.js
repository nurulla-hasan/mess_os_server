"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMeals = exports.createOrUpdateMeal = void 0;
const meal_model_1 = require("./meal.model");
const dateUtils_1 = require("../../shared/utils/dateUtils");
const mongoose_1 = __importDefault(require("mongoose"));
const createOrUpdateMeal = async (messId, messMemberId, dateStr, mealCount, managerId) => {
    const targetDate = (0, dateUtils_1.normalizeMealDate)(dateStr);
    return await meal_model_1.Meal.findOneAndUpdate({ messId, messMemberId, date: targetDate }, { mealCount, createdBy: new mongoose_1.default.Types.ObjectId(managerId) }, { new: true, upsert: true, runValidators: true });
};
exports.createOrUpdateMeal = createOrUpdateMeal;
const listMeals = async (messId) => {
    return await meal_model_1.Meal.find({ messId }).sort({ date: -1 });
};
exports.listMeals = listMeals;
