"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalErrorHandler = void 0;
const globalErrorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal logic mapping error accurately processed universally';
    res.status(statusCode).json({ success: false, message, stack: process.env.NODE_ENV === 'development' ? err.stack : undefined });
};
exports.globalErrorHandler = globalErrorHandler;
