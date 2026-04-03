"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscribeSchema = void 0;
const zod_1 = require("zod");
exports.subscribeSchema = zod_1.z.object({
    body: zod_1.z.object({
        planId: zod_1.z.string().min(1),
        paymentToken: zod_1.z.string().min(1)
    }).strict()
});
