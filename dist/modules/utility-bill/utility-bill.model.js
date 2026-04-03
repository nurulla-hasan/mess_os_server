"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UtilityBill = void 0;
const mongoose_1 = require("mongoose");
const utilityBillSchema = new mongoose_1.Schema({
    messId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Mess', required: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    billingMonth: { type: Number, required: true },
    year: { type: Number, required: true },
    dueDate: { type: Date },
    status: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' }
}, { timestamps: true, versionKey: false, toJSON: { transform: (_, ret) => { ret.id = ret._id; delete ret._id; return ret; } } });
exports.UtilityBill = (0, mongoose_1.model)('UtilityBill', utilityBillSchema);
