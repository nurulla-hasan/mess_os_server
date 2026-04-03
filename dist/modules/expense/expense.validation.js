"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expenseIdParamSchema = exports.createExpenseSchema = void 0;
const zod_1 = require("zod");
const mongoose_1 = require("mongoose");
const ledgerEntryTypes_1 = require("../../constants/ledgerEntryTypes");
const oId = zod_1.z.string().refine(mongoose_1.isValidObjectId);
exports.createExpenseSchema = zod_1.z.object({
    body: zod_1.z.object({
        category: zod_1.z.string().min(1),
        amount: zod_1.z.number().positive(),
        date: zod_1.z.string().datetime(),
        paidBy: oId,
        fundSource: zod_1.z.enum([ledgerEntryTypes_1.FUND_SOURCES.MESS_CASH, ledgerEntryTypes_1.FUND_SOURCES.PERSONAL_CASH]),
        receiptUrl: zod_1.z.string().url().optional()
    }).strict()
});
exports.expenseIdParamSchema = zod_1.z.object({
    params: zod_1.z.object({ expenseId: oId }).strict()
});
