"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertToMarketSchedule = exports.rejectShoppingList = exports.approveShoppingList = exports.getShoppingListById = exports.getShoppingLists = exports.generateShoppingList = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const ai_shopping_model_1 = require("./ai-shopping.model");
const menu_plan_model_1 = require("../menu-plan/menu-plan.model");
const market_schedule_model_1 = require("../market-schedule/market-schedule.model");
const aiService_1 = require("../../shared/services/aiService");
const dateUtils_1 = require("../../shared/utils/dateUtils");
const apiError_1 = require("../../shared/utils/apiError");
const generateShoppingList = async (messId, payload, userId) => {
    const menu = await menu_plan_model_1.MenuPlan.findOne({ _id: payload.menuPlanId, messId });
    if (!menu)
        throw new apiError_1.AppError(404, 'Menu plan not found');
    const generatedItems = await aiService_1.aiService.generateShoppingListItems(menu.meals);
    return await ai_shopping_model_1.AiShoppingList.create({
        messId,
        menuPlanId: menu._id,
        targetDate: (0, dateUtils_1.normalizeMealDate)(payload.targetDate),
        items: generatedItems,
        status: 'draft',
        createdBy: new mongoose_1.default.Types.ObjectId(userId)
    });
};
exports.generateShoppingList = generateShoppingList;
const getShoppingLists = async (messId) => {
    return await ai_shopping_model_1.AiShoppingList.find({ messId }).sort({ targetDate: -1 });
};
exports.getShoppingLists = getShoppingLists;
const getShoppingListById = async (messId, listId) => {
    const list = await ai_shopping_model_1.AiShoppingList.findOne({ _id: listId, messId });
    if (!list)
        throw new apiError_1.AppError(404, 'List not found');
    return list;
};
exports.getShoppingListById = getShoppingListById;
const approveShoppingList = async (messId, listId) => {
    const list = await ai_shopping_model_1.AiShoppingList.findOneAndUpdate({ _id: listId, messId, status: 'draft' }, { status: 'approved' }, { new: true });
    if (!list)
        throw new apiError_1.AppError(404, 'List not eligible for approval');
    return list;
};
exports.approveShoppingList = approveShoppingList;
const rejectShoppingList = async (messId, listId) => {
    const list = await ai_shopping_model_1.AiShoppingList.findOneAndUpdate({ _id: listId, messId, status: 'draft' }, { status: 'rejected' }, { new: true });
    if (!list)
        throw new apiError_1.AppError(404, 'List not eligible for rejection');
    return list;
};
exports.rejectShoppingList = rejectShoppingList;
const convertToMarketSchedule = async (messId, listId, userId, payload) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const list = await ai_shopping_model_1.AiShoppingList.findOne({ _id: listId, messId, status: 'approved' }).session(session);
        if (!list)
            throw new apiError_1.AppError(404, 'List must be approved to be converted');
        list.status = 'converted';
        const schedule = await market_schedule_model_1.MarketSchedule.create([{
                messId,
                assignedTo: payload.assignedTo.map((id) => new mongoose_1.default.Types.ObjectId(id)),
                targetDate: list.targetDate,
                shoppingItems: list.items.map(item => ({ name: item.name, quantity: item.quantity })),
                estimatedBudget: payload.estimatedBudget,
                status: 'pending',
                createdBy: new mongoose_1.default.Types.ObjectId(userId)
            }], { session });
        list.marketScheduleId = schedule[0]._id;
        await list.save({ session });
        await session.commitTransaction();
        return schedule[0];
    }
    catch (err) {
        await session.abortTransaction();
        throw err;
    }
    finally {
        session.endSession();
    }
};
exports.convertToMarketSchedule = convertToMarketSchedule;
