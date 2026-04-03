"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionHistory = void 0;
const mongoose_1 = require("mongoose");
const subHistorySchema = new mongoose_1.Schema({
    messId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Mess', required: true },
    planId: { type: String, required: true },
    action: { type: String, required: true, enum: ['trial_started', 'subscribed', 'canceled', 'payment_failed'] },
    amount: { type: Number },
    note: { type: String }
}, {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
    toJSON: { transform: (_, ret) => { ret.id = ret._id; delete ret._id; return ret; } }
});
exports.SubscriptionHistory = (0, mongoose_1.model)('SubscriptionHistory', subHistorySchema);
