"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginUser = exports.registerUser = void 0;
const user_model_1 = require("../user/user.model");
const apiError_1 = require("../../shared/utils/apiError");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../../config");
const registerUser = async (payload) => {
    const existing = await user_model_1.User.findOne({ email: payload.email });
    if (existing)
        throw new apiError_1.AppError(400, 'Email already formally tied to system');
    const passwordHash = await bcrypt_1.default.hash(payload.password, 10);
    const user = await user_model_1.User.create({ ...payload, passwordHash });
    return user;
};
exports.registerUser = registerUser;
const loginUser = async (payload) => {
    const user = await user_model_1.User.findOne({ email: payload.email }).select('+passwordHash');
    if (!user || user.status === 'blocked')
        throw new apiError_1.AppError(401, 'Credentials completely unverified or structurally blocked');
    const isMatch = await bcrypt_1.default.compare(payload.password, user.passwordHash);
    if (!isMatch)
        throw new apiError_1.AppError(401, 'Credentials completely unverified');
    const accessToken = jsonwebtoken_1.default.sign({ userId: user._id, globalRole: user.globalRole }, config_1.config.jwt.accessSecret, { expiresIn: config_1.config.jwt.accessEpiresIn });
    const refreshToken = jsonwebtoken_1.default.sign({ userId: user._id, globalRole: user.globalRole }, config_1.config.jwt.refreshSecret, { expiresIn: config_1.config.jwt.refreshExpiresIn });
    return { user, accessToken, refreshToken };
};
exports.loginUser = loginUser;
