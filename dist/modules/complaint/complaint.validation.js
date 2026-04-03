"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveComplaintSchema = exports.updateStatusSchema = exports.createComplaintSchema = void 0;
const zod_1 = require("zod");
exports.createComplaintSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(1),
        description: zod_1.z.string().min(1)
    }).strict()
});
exports.updateStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z.enum(['in_progress'])
    }).strict()
});
exports.resolveComplaintSchema = zod_1.z.object({
    body: zod_1.z.object({
        resolvedNote: zod_1.z.string().min(1).optional()
    }).strict()
});
