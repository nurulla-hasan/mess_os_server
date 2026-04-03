"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectRequest = exports.approveRequest = exports.listRequests = exports.createRequest = void 0;
const meal_off_request_model_1 = require("./meal-off-request.model");
const meal_model_1 = require("../meal/meal.model");
const apiError_1 = require("../../shared/utils/apiError");
const dateUtils_1 = require("../../shared/utils/dateUtils");
const mongoose_1 = __importDefault(require("mongoose"));
const createRequest = async (messId, payload) => {
    const sDate = (0, dateUtils_1.normalizeMealDate)(payload.startDate);
    const eDate = (0, dateUtils_1.normalizeMealDate)(payload.endDate);
    if (eDate < sDate)
        throw new apiError_1.AppError(400, 'End date must be after or same as start date');
    return await meal_off_request_model_1.MealOffRequest.create({ messId, messMemberId: payload.messMemberId, startDate: sDate, endDate: eDate, reason: payload.reason, status: 'pending' });
};
exports.createRequest = createRequest;
const listRequests = async (messId) => {
    return await meal_off_request_model_1.MealOffRequest.find({ messId }).sort({ startDate: 1 });
};
exports.listRequests = listRequests;
const approveRequest = async (messId, requestId, managerUserId) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const req = await meal_off_request_model_1.MealOffRequest.findOne({ _id: requestId, messId, status: 'pending' }).session(session);
        if (!req)
            throw new apiError_1.AppError(404, 'Pending request not found');
        req.status = 'approved';
        req.approvedBy = new mongoose_1.default.Types.ObjectId(managerUserId);
        // Business Rule: Future dates managed automatically. Past dates ignored requiring explicit human review.
        const todayNormalized = (0, dateUtils_1.normalizeMealDate)((0, dateUtils_1.getDhakaNow)());
        const datesToLock = (0, dateUtils_1.generateDateRange)(req.startDate, req.endDate);
        const automatedMealPromises = datesToLock.map(d => {
            if (d >= todayNormalized) {
                return meal_model_1.Meal.findOneAndUpdate({ messId, messMemberId: req.messMemberId, date: d }, { mealCount: 0, createdBy: new mongoose_1.default.Types.ObjectId(managerUserId) }, { new: true, upsert: true, runValidators: true, session });
            }
            return Promise.resolve(null);
        });
        await Promise.all(automatedMealPromises);
        await req.save({ session });
        await session.commitTransaction();
        return req;
    }
    catch (err) {
        await session.abortTransaction();
        throw err;
    }
    finally {
        session.endSession();
    }
};
exports.approveRequest = approveRequest;
const rejectRequest = async (messId, requestId, managerUserId) => {
    const req = await meal_off_request_model_1.MealOffRequest.findOneAndUpdate({ _id: requestId, messId, status: 'pending' }, { status: 'rejected', approvedBy: new mongoose_1.default.Types.ObjectId(managerUserId) }, { new: true, runValidators: true });
    if (!req)
        throw new apiError_1.AppError(404, 'Pending request not found');
    return req;
};
exports.rejectRequest = rejectRequest;
