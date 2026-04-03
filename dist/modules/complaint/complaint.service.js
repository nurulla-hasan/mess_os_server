"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectComplaint = exports.resolveComplaint = exports.updateComplaintStatus = exports.getComplaintById = exports.getMyComplaints = exports.getComplaints = exports.createComplaint = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const complaint_model_1 = require("./complaint.model");
const apiError_1 = require("../../shared/utils/apiError");
const createComplaint = async (messId, payload, myMemberId) => {
    return await complaint_model_1.Complaint.create({ messId, messMemberId: new mongoose_1.default.Types.ObjectId(myMemberId), ...payload });
};
exports.createComplaint = createComplaint;
const getComplaints = async (messId) => {
    return await complaint_model_1.Complaint.find({ messId }).sort({ createdAt: -1 });
};
exports.getComplaints = getComplaints;
const getMyComplaints = async (messId, messMemberId) => {
    return await complaint_model_1.Complaint.find({ messId, messMemberId }).sort({ createdAt: -1 });
};
exports.getMyComplaints = getMyComplaints;
const getComplaintById = async (messId, complaintId, myMemberId, isManager) => {
    const comp = await complaint_model_1.Complaint.findOne({ _id: complaintId, messId });
    if (!comp)
        throw new apiError_1.AppError(404, 'Complaint not found');
    if (!isManager && comp.messMemberId.toString() !== myMemberId) {
        throw new apiError_1.AppError(403, 'Permission denied, you cannot view this complaint');
    }
    return comp;
};
exports.getComplaintById = getComplaintById;
const updateComplaintStatus = async (messId, complaintId, status) => {
    const comp = await complaint_model_1.Complaint.findOneAndUpdate({ _id: complaintId, messId }, { status }, { new: true, runValidators: true });
    if (!comp)
        throw new apiError_1.AppError(404, 'Complaint bounds check failed');
    return comp;
};
exports.updateComplaintStatus = updateComplaintStatus;
const resolveComplaint = async (messId, complaintId, resolvedNote, managerId) => {
    return await complaint_model_1.Complaint.findOneAndUpdate({ _id: complaintId, messId }, { status: 'resolved', resolvedNote, resolvedAt: new Date(), resolvedBy: new mongoose_1.default.Types.ObjectId(managerId) }, { new: true });
};
exports.resolveComplaint = resolveComplaint;
const rejectComplaint = async (messId, complaintId, resolvedNote, managerId) => {
    return await complaint_model_1.Complaint.findOneAndUpdate({ _id: complaintId, messId }, { status: 'rejected', resolvedNote, resolvedAt: new Date(), resolvedBy: new mongoose_1.default.Types.ObjectId(managerId) }, { new: true });
};
exports.rejectComplaint = rejectComplaint;
