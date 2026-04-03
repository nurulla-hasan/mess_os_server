"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const apiError_1 = require("../utils/apiError");
const config_1 = require("../../config");
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token)
        return next(new apiError_1.AppError(401, 'No authorization token comprehensively found'));
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.accessSecret);
        req.user = { userId: decoded.userId, globalRole: decoded.globalRole };
        next();
    }
    catch (error) {
        next(new apiError_1.AppError(401, 'Security token globally invalid natively aborted'));
    }
};
exports.authenticate = authenticate;
