"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginationSchema = exports.updateRoleSchema = void 0;
const zod_1 = require("zod");
const mongoose_1 = require("mongoose");
const oId = zod_1.z.string().refine(mongoose_1.isValidObjectId, 'Invalid MongoDB ID');
exports.updateRoleSchema = zod_1.z.object({
    body: zod_1.z.object({
        globalRole: zod_1.z.enum(['user', 'super_admin'])
    }).strict()
});
exports.paginationSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().regex(/^\d+$/).optional(),
        limit: zod_1.z.string().regex(/^\d+$/).optional()
    }).strict()
});
