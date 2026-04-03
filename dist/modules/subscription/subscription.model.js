"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Subscription = void 0;
const mongoose_1 = require("mongoose");
const subSchema = new mongoose_1.Schema({
    messId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Mess', required: true, unique: true },
    planId: { type: String, required: true },
    status: { type: String, required: true, enum: ['trialing', 'active', 'past_due', 'canceled', 'unpaid'], default: 'trialing' },
    currentPeriodStart: { type: Date, required: true },
    currentPeriodEnd: { type: Date, required: true },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    stripeSubscriptionId: String,
    stripeCustomerId: String
}, {
    timestamps: true,
    versionKey: false,
    toJSON: { transform: (_, ret) => { ret.id = ret._id; delete ret._id; return ret; } }
});
exports.Subscription = (0, mongoose_1.model)('Subscription', subSchema);
