"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logMealSchema = void 0;
const zod_1 = require("zod");
const mongoose_1 = require("mongoose");
const oId = zod_1.z.string().refine(mongoose_1.isValidObjectId);
exports.logMealSchema = zod_1.z.object({
    body: zod_1.z.object({
        messMemberId: oId,
        date: zod_1.z.string().datetime().or(zod_1.z.string()), // Accept ISO string generic
        mealCount: zod_1.z.number().min(0)
    }).strict()
});
