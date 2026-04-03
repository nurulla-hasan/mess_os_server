"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.finalizeBillingSchema = exports.previewBillingSchema = void 0;
const zod_1 = require("zod");
exports.previewBillingSchema = zod_1.z.object({
    body: zod_1.z.object({
        month: zod_1.z.number().min(1).max(12),
        year: zod_1.z.number().positive(),
    }).strict()
});
exports.finalizeBillingSchema = zod_1.z.object({
    body: zod_1.z.object({
        month: zod_1.z.number().min(1).max(12),
        year: zod_1.z.number().positive(),
    }).strict()
});
