"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlatformStats = exports.suspendMess = exports.blockUser = exports.updateUserRole = exports.getAllMesses = exports.getAllUsers = void 0;
const user_model_1 = require("../user/user.model");
const mess_model_1 = require("../mess/mess.model");
const apiError_1 = require("../../shared/utils/apiError");
const getAllUsers = async (page, limit) => {
    return await user_model_1.User.find().select('-passwordHash').skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 });
};
exports.getAllUsers = getAllUsers;
const getAllMesses = async (page, limit) => {
    return await mess_model_1.Mess.find().skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 });
};
exports.getAllMesses = getAllMesses;
const updateUserRole = async (userId, targetRole) => {
    if (!['user', 'super_admin'].includes(targetRole))
        throw new apiError_1.AppError(400, 'Invalid platform globalRole specified');
    const user = await user_model_1.User.findByIdAndUpdate(userId, { globalRole: targetRole }, { new: true }).select('-passwordHash');
    if (!user)
        throw new apiError_1.AppError(404, 'User not found in global mapping');
    return user;
};
exports.updateUserRole = updateUserRole;
const blockUser = async (userId) => {
    const user = await user_model_1.User.findByIdAndUpdate(userId, { status: 'blocked' }, { new: true }).select('-passwordHash');
    if (!user)
        throw new apiError_1.AppError(404, 'User not found');
    return user;
};
exports.blockUser = blockUser;
const suspendMess = async (messId) => {
    const mess = await mess_model_1.Mess.findByIdAndUpdate(messId, { status: 'suspended' }, { new: true });
    if (!mess)
        throw new apiError_1.AppError(404, 'Mess not found');
    return mess;
};
exports.suspendMess = suspendMess;
const getPlatformStats = async () => {
    const totalUsers = await user_model_1.User.countDocuments();
    const totalMesses = await mess_model_1.Mess.countDocuments();
    const suspendedMesses = await mess_model_1.Mess.countDocuments({ status: 'suspended' });
    const activeMesses = await mess_model_1.Mess.countDocuments({ status: 'active' });
    return { totalUsers, totalMesses, suspendedMesses, activeMesses };
};
exports.getPlatformStats = getPlatformStats;
