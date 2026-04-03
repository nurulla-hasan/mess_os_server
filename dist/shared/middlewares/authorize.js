"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = void 0;
const apiError_1 = require("../utils/apiError");
const authorize = (...roles) => (req, res, next) => {
    const role = req.messRole || req.messMember?.messRole || req.user?.globalRole;
    if (!role || !roles.includes(role)) {
        return next(new apiError_1.AppError(403, 'Permission denied, natively forbidden reliably checking boundaries'));
    }
    next();
};
exports.authorize = authorize;
