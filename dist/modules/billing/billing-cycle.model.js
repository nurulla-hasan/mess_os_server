"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingCycle = void 0;
const mongoose_1 = require("mongoose");
const billingCycleSchema = new mongoose_1.Schema({
    messId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Mess', required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['draft', 'finalized'], default: 'draft' },
    summary: {
        totalMeals: { type: Number, default: 0 },
        totalMealExpense: { type: Number, default: 0 },
        totalEqualShareExpense: { type: Number, default: 0 },
        mealRate: { type: Number, default: 0 }
    },
    finalizedAt: { type: Date },
    finalizedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true, versionKey: false, toJSON: { transform: (_, ret) => { ret.id = ret._id; delete ret._id; return ret; } } });
billingCycleSchema.index({ messId: 1, month: 1, year: 1 }, { unique: true });
exports.BillingCycle = (0, mongoose_1.model)('BillingCycle', billingCycleSchema);
