"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMealOffSchema = void 0;
const zod_1 = require("zod");
const mongoose_1 = require("mongoose");
const oId = zod_1.z.string().refine(mongoose_1.isValidObjectId);
exports.createMealOffSchema = zod_1.z.object({
    body: zod_1.z.object({
        messMemberId: oId,
        startDate: zod_1.z.string(),
        endDate: zod_1.z.string(),
        reason: zod_1.z.string().optional()
    }).strict()
});
