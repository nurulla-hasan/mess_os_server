"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeSchedule = exports.voidSchedule = exports.updateActualSpent = exports.reassignSchedule = exports.updateSchedule = exports.getMyDuties = exports.getSchedules = exports.createSchedule = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const market_schedule_model_1 = require("./market-schedule.model");
const expense_model_1 = require("../expense/expense.model");
const apiError_1 = require("../../shared/utils/apiError");
const dateUtils_1 = require("../../shared/utils/dateUtils");
const createSchedule = async (messId, payload, userId) => {
    return await market_schedule_model_1.MarketSchedule.create({
        messId,
        ...payload,
        targetDate: (0, dateUtils_1.normalizeMealDate)(payload.targetDate),
        status: 'pending',
        createdBy: new mongoose_1.default.Types.ObjectId(userId)
    });
};
exports.createSchedule = createSchedule;
const getSchedules = async (messId) => {
    return await market_schedule_model_1.MarketSchedule.find({ messId }).sort({ targetDate: -1 });
};
exports.getSchedules = getSchedules;
const getMyDuties = async (messId, myMemberId) => {
    return await market_schedule_model_1.MarketSchedule.find({ messId, assignedTo: new mongoose_1.default.Types.ObjectId(myMemberId) }).sort({ targetDate: -1 });
};
exports.getMyDuties = getMyDuties;
const updateSchedule = async (messId, scheduleId, payload) => {
    const schedule = await market_schedule_model_1.MarketSchedule.findOneAndUpdate({ _id: scheduleId, messId, status: 'pending' }, payload, { new: true, runValidators: true });
    if (!schedule)
        throw new apiError_1.AppError(404, 'Schedule not found or not mutable');
    return schedule;
};
exports.updateSchedule = updateSchedule;
const reassignSchedule = async (messId, scheduleId, assignedTo) => {
    const schedule = await market_schedule_model_1.MarketSchedule.findOneAndUpdate({ _id: scheduleId, messId, status: 'pending' }, { assignedTo: assignedTo.map((id) => new mongoose_1.default.Types.ObjectId(id)) }, { new: true, runValidators: true });
    if (!schedule)
        throw new apiError_1.AppError(404, 'Schedule not mutable');
    return schedule;
};
exports.reassignSchedule = reassignSchedule;
const updateActualSpent = async (messId, scheduleId, actualSpent, myMemberId, isManager) => {
    const schedule = await market_schedule_model_1.MarketSchedule.findOne({ _id: scheduleId, messId, status: 'pending' });
    if (!schedule)
        throw new apiError_1.AppError(404, 'Schedule not mutable');
    if (!isManager && !schedule.assignedTo.some(id => id.toString() === myMemberId)) {
        throw new apiError_1.AppError(403, 'Permission denied, only managers or assigned members can update spent');
    }
    schedule.actualSpent = actualSpent;
    await schedule.save();
    return schedule;
};
exports.updateActualSpent = updateActualSpent;
const voidSchedule = async (messId, scheduleId) => {
    const schedule = await market_schedule_model_1.MarketSchedule.findOneAndUpdate({ _id: scheduleId, messId, status: 'pending' }, { status: 'void' }, { new: true });
    if (!schedule)
        throw new apiError_1.AppError(404, 'Schedule not mutable');
    return schedule;
};
exports.voidSchedule = voidSchedule;
const completeSchedule = async (messId, scheduleId, payload, myMemberId, actorUserId, isManager) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const schedule = await market_schedule_model_1.MarketSchedule.findOne({ _id: scheduleId, messId, status: 'pending' }).session(session);
        if (!schedule)
            throw new apiError_1.AppError(404, 'Schedule not currently actionable');
        if (!isManager && payload.actorMessMemberId !== myMemberId) {
            throw new apiError_1.AppError(403, 'Permission denied, you can only claim expenses paid by yourself');
        }
        if (!isManager && !schedule.assignedTo.some(id => id.toString() === myMemberId)) {
            throw new apiError_1.AppError(403, 'Permission denied, only assigned members or managers can complete tasks');
        }
        schedule.status = 'completed';
        schedule.actualSpent = payload.actualSpent;
        schedule.completedAt = new Date();
        schedule.completedBy = new mongoose_1.default.Types.ObjectId(actorUserId);
        const expense = await expense_model_1.Expense.create([{
                messId,
                category: 'bazar',
                amount: payload.actualSpent,
                date: new Date(),
                paidBy: new mongoose_1.default.Types.ObjectId(payload.actorMessMemberId),
                fundSource: payload.fundSource,
                status: 'pending'
            }], { session });
        schedule.expenseId = expense[0]._id;
        await schedule.save({ session });
        await session.commitTransaction();
        return schedule;
    }
    catch (err) {
        await session.abortTransaction();
        throw err;
    }
    finally {
        session.endSession();
    }
};
exports.completeSchedule = completeSchedule;
