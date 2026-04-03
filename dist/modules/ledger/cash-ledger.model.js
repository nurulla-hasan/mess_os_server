"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CashLedger = void 0;
const mongoose_1 = require("mongoose");
const ledgerEntryTypes_1 = require("../../constants/ledgerEntryTypes");
const cashLedgerSchema = new mongoose_1.Schema({
    messId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Mess', required: true },
    type: { type: String, enum: Object.values(ledgerEntryTypes_1.CASH_TRANSACTION_TYPES), required: true },
    amount: { type: Number, required: true },
    referenceType: { type: String, enum: Object.values(ledgerEntryTypes_1.REFERENCE_TYPES), required: true },
    referenceId: { type: mongoose_1.Schema.Types.ObjectId, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    isVoided: { type: Boolean, default: false }
}, { timestamps: true, versionKey: false, toJSON: { transform: (_, ret) => { ret.id = ret._id; delete ret._id; return ret; } } });
cashLedgerSchema.index({ messId: 1, date: -1 });
exports.CashLedger = (0, mongoose_1.model)('CashLedger', cashLedgerSchema);
