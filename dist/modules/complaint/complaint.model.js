"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Complaint = void 0;
const mongoose_1 = require("mongoose");
const complaintSchema = new mongoose_1.Schema({
    messId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Mess', required: true },
    messMemberId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'MessMember', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ['open', 'in_progress', 'resolved', 'rejected'], default: 'open' },
    resolvedNote: { type: String },
    resolvedAt: { type: Date },
    resolvedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true,
    versionKey: false,
    toJSON: { transform: (_, ret) => { ret.id = ret._id; delete ret._id; return ret; } }
});
complaintSchema.index({ messId: 1, status: 1 });
exports.Complaint = (0, mongoose_1.model)('Complaint', complaintSchema);
