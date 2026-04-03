"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessMember = void 0;
const mongoose_1 = require("mongoose");
const reqSchema = new mongoose_1.Schema({
    messId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Mess', required: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    messRole: { type: String, enum: ['manager', 'member'], default: 'member' },
    status: { type: String, enum: ['pending', 'active', 'rejected', 'removed'], default: 'pending' },
    joinedAt: { type: Date },
    leftAt: { type: Date }
}, {
    timestamps: true, versionKey: false,
    toJSON: { transform: (_, ret) => { ret.id = ret._id; delete ret._id; return ret; } }
});
exports.MessMember = (0, mongoose_1.model)('MessMember', reqSchema);
