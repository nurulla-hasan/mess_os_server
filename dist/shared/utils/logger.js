"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authLogger = void 0;
exports.authLogger = {
    info: (event, meta = {}) => {
        console.log(`[AUTH][INFO][${new Date().toISOString()}] ${event}`, JSON.stringify(meta));
    },
    warn: (event, meta = {}) => {
        console.warn(`[AUTH][WARN][${new Date().toISOString()}] ${event}`, JSON.stringify(meta));
    },
    error: (event, error, meta = {}) => {
        console.error(`[AUTH][ERROR][${new Date().toISOString()}] ${event}`, error?.message || error, JSON.stringify(meta));
    }
};
