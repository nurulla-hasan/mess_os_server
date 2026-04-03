"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.archiveNotice = exports.pinNotice = exports.updateNotice = exports.getNotice = exports.getNotices = exports.createNotice = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const notice_model_1 = require("./notice.model");
const emailService_1 = require("../../shared/services/emailService");
const apiError_1 = require("../../shared/utils/apiError");
const createNotice = async (messId, payload, userId) => {
    const notice = await notice_model_1.Notice.create({ messId, ...payload, createdBy: new mongoose_1.default.Types.ObjectId(userId) });
    emailService_1.emailService.sendNotice(messId, notice.title).catch(console.error);
    return notice;
};
exports.createNotice = createNotice;
const getNotices = async (messId) => {
    return await notice_model_1.Notice.find({ messId }).sort({ isPinned: -1, createdAt: -1 });
};
exports.getNotices = getNotices;
const getNotice = async (messId, noticeId) => {
    const note = await notice_model_1.Notice.findOne({ _id: noticeId, messId });
    if (!note)
        throw new apiError_1.AppError(404, 'Notice not found');
    return note;
};
exports.getNotice = getNotice;
const updateNotice = async (messId, noticeId, payload) => {
    const note = await notice_model_1.Notice.findOneAndUpdate({ _id: noticeId, messId }, payload, { new: true, runValidators: true });
    if (!note)
        throw new apiError_1.AppError(404, 'Notice not found');
    return note;
};
exports.updateNotice = updateNotice;
const pinNotice = async (messId, noticeId) => {
    const note = await notice_model_1.Notice.findOneAndUpdate({ _id: noticeId, messId }, { isPinned: true }, { new: true, runValidators: true });
    if (!note)
        throw new apiError_1.AppError(404, 'Notice not found');
    return note;
};
exports.pinNotice = pinNotice;
const archiveNotice = async (messId, noticeId) => {
    const note = await notice_model_1.Notice.findOneAndUpdate({ _id: noticeId, messId }, { status: 'archived' }, { new: true, runValidators: true });
    if (!note)
        throw new apiError_1.AppError(404, 'Notice not found');
    return note;
};
exports.archiveNotice = archiveNotice;
