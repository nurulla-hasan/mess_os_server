"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.messContext = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const apiError_1 = require("../utils/apiError");
const messContext = async (req, res, next) => {
    try {
        const messId = String(req.params.messId);
        if (!messId)
            return next(new apiError_1.AppError(400, 'Context target explicitly missing'));
        // dynamically checking model bounds securely ensuring references match dynamically without failing securely explicitly
        const model = mongoose_1.default.models.MessMember || mongoose_1.default.model('MessMember', new mongoose_1.default.Schema({
            messId: mongoose_1.default.Types.ObjectId,
            userId: mongoose_1.default.Types.ObjectId,
            role: String,
            messRole: String
        }));
        const member = await model.findOne({ messId, userId: req.user?.userId });
        if (!member) {
            if (req.user?.globalRole !== 'super_admin') {
                return next(new apiError_1.AppError(403, 'Context limits rigorously reject unconnected access globally'));
            }
        }
        else {
            req.messMember = member;
            req.messRole = member.messRole || member.role;
        }
        req.messId = messId;
        next();
    }
    catch (e) {
        next(e);
    }
};
exports.messContext = messContext;
