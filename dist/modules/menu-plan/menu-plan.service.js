"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.archiveMenuPlan = exports.publishMenuPlan = exports.updateMenuPlan = exports.getMenuPlanByDate = exports.getMenuPlanById = exports.getMenuPlans = exports.createMenuPlan = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const menu_plan_model_1 = require("./menu-plan.model");
const dateUtils_1 = require("../../shared/utils/dateUtils");
const aiService_1 = require("../../shared/services/aiService");
const apiError_1 = require("../../shared/utils/apiError");
const createMenuPlan = async (messId, payload, userId) => {
    const targetDate = (0, dateUtils_1.normalizeMealDate)(payload.date);
    let meals = payload.meals;
    if (payload.isAiGenerated) {
        meals = await aiService_1.aiService.generateMenuPlanContent(targetDate);
    }
    return await menu_plan_model_1.MenuPlan.create({
        messId,
        date: targetDate,
        meals,
        status: 'draft',
        isAiGenerated: payload.isAiGenerated,
        createdBy: new mongoose_1.default.Types.ObjectId(userId)
    });
};
exports.createMenuPlan = createMenuPlan;
const getMenuPlans = async (messId) => {
    return await menu_plan_model_1.MenuPlan.find({ messId }).sort({ date: -1 });
};
exports.getMenuPlans = getMenuPlans;
const getMenuPlanById = async (messId, planId) => {
    const plan = await menu_plan_model_1.MenuPlan.findOne({ _id: planId, messId });
    if (!plan)
        throw new apiError_1.AppError(404, 'Menu plan not found');
    return plan;
};
exports.getMenuPlanById = getMenuPlanById;
const getMenuPlanByDate = async (messId, dateStr) => {
    const plan = await menu_plan_model_1.MenuPlan.findOne({ messId, date: (0, dateUtils_1.normalizeMealDate)(dateStr) });
    if (!plan)
        throw new apiError_1.AppError(404, 'Menu plan not found for date');
    return plan;
};
exports.getMenuPlanByDate = getMenuPlanByDate;
const updateMenuPlan = async (messId, planId, payload) => {
    const plan = await menu_plan_model_1.MenuPlan.findOneAndUpdate({ _id: planId, messId }, { meals: payload.meals }, { new: true, runValidators: true });
    if (!plan)
        throw new apiError_1.AppError(404, 'Menu plan not found');
    return plan;
};
exports.updateMenuPlan = updateMenuPlan;
const publishMenuPlan = async (messId, planId) => {
    const plan = await menu_plan_model_1.MenuPlan.findOneAndUpdate({ _id: planId, messId }, { status: 'published' }, { new: true, runValidators: true });
    if (!plan)
        throw new apiError_1.AppError(404, 'Menu plan not found');
    return plan;
};
exports.publishMenuPlan = publishMenuPlan;
const archiveMenuPlan = async (messId, planId) => {
    const plan = await menu_plan_model_1.MenuPlan.findOneAndUpdate({ _id: planId, messId }, { status: 'archived' }, { new: true, runValidators: true });
    if (!plan)
        throw new apiError_1.AppError(404, 'Menu plan not found');
    return plan;
};
exports.archiveMenuPlan = archiveMenuPlan;
