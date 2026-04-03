"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateNoticeSchema = exports.createNoticeSchema = void 0;
const zod_1 = require("zod");
exports.createNoticeSchema = zod_1.z.object({ body: zod_1.z.object({ title: zod_1.z.string().min(1), content: zod_1.z.string().min(1), isPinned: zod_1.z.boolean().optional() }).strict() });
exports.updateNoticeSchema = zod_1.z.object({ body: zod_1.z.object({ title: zod_1.z.string().optional(), content: zod_1.z.string().optional(), isPinned: zod_1.z.boolean().optional(), status: zod_1.z.enum(['active', 'archived']).optional() }).strict() });
