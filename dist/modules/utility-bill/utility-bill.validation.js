"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUtilityBillSchema = void 0;
const zod_1 = require("zod");
exports.createUtilityBillSchema = zod_1.z.object({
    body: zod_1.z.object({
        category: zod_1.z.string().min(1),
        amount: zod_1.z.number().positive(),
        billingMonth: zod_1.z.number().min(1).max(12),
        year: zod_1.z.number().positive(),
        dueDate: zod_1.z.string().datetime().optional()
    }).strict()
});
