"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Notice = void 0;
const mongoose_1 = require("mongoose");
const noticeSchema = new mongoose_1.Schema({
    messId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Mess', required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    isPinned: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true }
}, {
    timestamps: true,
    versionKey: false,
    toJSON: { transform: (_, ret) => { ret.id = ret._id; delete ret._id; return ret; } }
});
noticeSchema.index({ messId: 1, status: 1 });
noticeSchema.index({ messId: 1, isPinned: -1, createdAt: -1 });
exports.Notice = (0, mongoose_1.model)('Notice', noticeSchema);
