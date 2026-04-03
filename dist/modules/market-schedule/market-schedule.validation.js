"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeMarketScheduleSchema = exports.updateActualSpentSchema = exports.reassignScheduleSchema = exports.updateMarketScheduleSchema = exports.createMarketScheduleSchema = void 0;
const zod_1 = require("zod");
const mongoose_1 = require("mongoose");
const ledgerEntryTypes_1 = require("../../constants/ledgerEntryTypes");
const oId = zod_1.z.string().refine(mongoose_1.isValidObjectId);
exports.createMarketScheduleSchema = zod_1.z.object({
    body: zod_1.z.object({
        assignedTo: zod_1.z.array(oId).min(1),
        targetDate: zod_1.z.string().datetime().or(zod_1.z.string()),
        shoppingItems: zod_1.z.array(zod_1.z.object({ name: zod_1.z.string(), quantity: zod_1.z.string() })),
        estimatedBudget: zod_1.z.number().positive()
    }).strict()
});
exports.updateMarketScheduleSchema = zod_1.z.object({
    body: zod_1.z.object({
        assignedTo: zod_1.z.array(oId).min(1).optional(),
        shoppingItems: zod_1.z.array(zod_1.z.object({ name: zod_1.z.string(), quantity: zod_1.z.string() })).optional(),
        estimatedBudget: zod_1.z.number().positive().optional()
    }).strict()
});
exports.reassignScheduleSchema = zod_1.z.object({
    body: zod_1.z.object({
        assignedTo: zod_1.z.array(oId).min(1)
    }).strict()
});
exports.updateActualSpentSchema = zod_1.z.object({
    body: zod_1.z.object({
        actualSpent: zod_1.z.number().nonnegative()
    }).strict()
});
exports.completeMarketScheduleSchema = zod_1.z.object({
    body: zod_1.z.object({
        actualSpent: zod_1.z.number().positive(),
        actorMessMemberId: oId,
        fundSource: zod_1.z.enum([ledgerEntryTypes_1.FUND_SOURCES.MESS_CASH, ledgerEntryTypes_1.FUND_SOURCES.PERSONAL_CASH])
    }).strict()
});
