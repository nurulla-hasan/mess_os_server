"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mess = void 0;
const mongoose_1 = require("mongoose");
const messSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    address: { type: String, required: true },
    inviteCode: { type: String, required: true, unique: true },
    settings: { type: mongoose_1.Schema.Types.Mixed },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' }
}, {
    timestamps: true, versionKey: false,
    toJSON: { transform: (_, ret) => { ret.id = ret._id; delete ret._id; return ret; } }
});
exports.Mess = (0, mongoose_1.model)('Mess', messSchema);
