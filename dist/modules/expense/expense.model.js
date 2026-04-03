"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Expense = void 0;
const mongoose_1 = require("mongoose");
const ledgerEntryTypes_1 = require("../../constants/ledgerEntryTypes");
const expenseSchema = new mongoose_1.Schema({
    messId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Mess', required: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    paidBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'MessMember', required: true },
    fundSource: { type: String, enum: Object.values(ledgerEntryTypes_1.FUND_SOURCES), required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reimbursementStatus: { type: String, enum: ['not_applicable', 'pending', 'reimbursed'], default: 'not_applicable' },
    receiptUrl: { type: String },
    receiptPublicId: { type: String },
    approvedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date }
}, { timestamps: true, versionKey: false, toJSON: { transform: (_, ret) => { ret.id = ret._id; delete ret._id; return ret; } } });
exports.Expense = (0, mongoose_1.model)('Expense', expenseSchema);
