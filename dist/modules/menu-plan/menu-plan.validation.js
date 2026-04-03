"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dateParamSchema = exports.updateMenuPlanSchema = exports.createMenuPlanSchema = void 0;
const zod_1 = require("zod");
const mongoose_1 = require("mongoose");
const oId = zod_1.z.string().refine(mongoose_1.isValidObjectId);
exports.createMenuPlanSchema = zod_1.z.object({
    body: zod_1.z.object({
        date: zod_1.z.string().datetime().or(zod_1.z.string()),
        meals: zod_1.z.object({
            breakfast: zod_1.z.string().optional(),
            lunch: zod_1.z.string().optional(),
            dinner: zod_1.z.string().optional()
        }).optional(),
        isAiGenerated: zod_1.z.boolean().default(false)
    }).strict()
});
exports.updateMenuPlanSchema = zod_1.z.object({
    body: zod_1.z.object({
        meals: zod_1.z.object({
            breakfast: zod_1.z.string().optional(),
            lunch: zod_1.z.string().optional(),
            dinner: zod_1.z.string().optional()
        }).optional()
    }).strict()
});
exports.dateParamSchema = zod_1.z.object({
    params: zod_1.z.object({ date: zod_1.z.string() }).strict()
});
