"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertListSchema = exports.generateListSchema = void 0;
const zod_1 = require("zod");
const mongoose_1 = require("mongoose");
const oId = zod_1.z.string().refine(mongoose_1.isValidObjectId);
exports.generateListSchema = zod_1.z.object({
    body: zod_1.z.object({
        menuPlanId: oId,
        targetDate: zod_1.z.string().datetime().or(zod_1.z.string())
    }).strict()
});
exports.convertListSchema = zod_1.z.object({
    body: zod_1.z.object({
        assignedTo: zod_1.z.array(oId).min(1),
        estimatedBudget: zod_1.z.number().positive()
    }).strict()
});
