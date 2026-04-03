"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePaymentStatusSchema = exports.createPaymentSchema = void 0;
const zod_1 = require("zod");
const mongoose_1 = require("mongoose");
const oId = zod_1.z.string().refine(mongoose_1.isValidObjectId, { message: 'Invalid ObjectId format' });
exports.createPaymentSchema = zod_1.z.object({
    body: zod_1.z.object({
        messMemberId: oId,
        amount: zod_1.z.number().positive(),
        method: zod_1.z.string().min(1),
        reference: zod_1.z.string().optional()
    }).strict()
});
// Approvals only need params validation realistically.
exports.updatePaymentStatusSchema = zod_1.z.object({
    params: zod_1.z.object({ paymentId: oId }).strict()
});
