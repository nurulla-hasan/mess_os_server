"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemberBill = void 0;
const mongoose_1 = require("mongoose");
const memberBillSchema = new mongoose_1.Schema({
    messId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Mess', required: true },
    billingCycleId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'BillingCycle', required: true },
    messMemberId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'MessMember', required: true },
    summary: {
        meals: { type: Number, required: true },
        mealRate: { type: Number, required: true },
        mealCharge: { type: Number, required: true },
        equalShare: { type: Number, required: true },
        previousDue: { type: Number, required: true },
        totalPaymentsAndCredits: { type: Number, required: true },
        finalPayable: { type: Number, required: true },
        finalDue: { type: Number, required: true },
        finalAdvance: { type: Number, required: true }
    },
    status: { type: String, enum: ['unpaid', 'paid', 'settled'], default: 'unpaid' },
    isArchived: { type: Boolean, default: false }
}, { timestamps: true, versionKey: false, toJSON: { transform: (_, ret) => { ret.id = ret._id; delete ret._id; return ret; } } });
memberBillSchema.index({ billingCycleId: 1, messMemberId: 1 });
exports.MemberBill = (0, mongoose_1.model)('MemberBill', memberBillSchema);
