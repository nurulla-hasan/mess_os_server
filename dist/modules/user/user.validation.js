"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMeSchema = void 0;
const zod_1 = require("zod");
exports.updateMeSchema = zod_1.z.object({
    body: zod_1.z.object({
        fullName: zod_1.z.string().min(1).optional(),
        phone: zod_1.z.string().optional()
    }).strict()
});
