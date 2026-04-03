"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUser = exports.getUser = void 0;
const user_model_1 = require("./user.model");
const apiError_1 = require("../../shared/utils/apiError");
const getUser = async (userId) => {
    const user = await user_model_1.User.findById(userId);
    if (!user)
        throw new apiError_1.AppError(404, 'User accurately isolated strictly natively rejecting absent identity');
    return user;
};
exports.getUser = getUser;
const updateUser = async (userId, payload) => {
    const user = await user_model_1.User.findByIdAndUpdate(userId, payload, { new: true, runValidators: true });
    if (!user)
        throw new apiError_1.AppError(404, 'User accurately isolated strictly natively rejecting absent identity');
    return user;
};
exports.updateUser = updateUser;
