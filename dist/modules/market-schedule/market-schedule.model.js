"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketSchedule = void 0;
const mongoose_1 = require("mongoose");
const scheduleSchema = new mongoose_1.Schema({
    messId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Mess', required: true },
    assignedTo: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'MessMember', required: true }],
    targetDate: { type: Date, required: true },
    shoppingItems: [{ name: String, quantity: String }],
    estimatedBudget: { type: Number, required: true },
    actualSpent: { type: Number },
    status: { type: String, enum: ['pending', 'completed', 'reassigned', 'void'], default: 'pending' },
    expenseId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Expense' },
    completedAt: { type: Date },
    completedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true }
}, {
    timestamps: true,
    versionKey: false,
    toJSON: { transform: (_, ret) => { ret.id = ret._id; delete ret._id; return ret; } }
});
scheduleSchema.index({ messId: 1, targetDate: 1 });
exports.MarketSchedule = (0, mongoose_1.model)('MarketSchedule', scheduleSchema);
