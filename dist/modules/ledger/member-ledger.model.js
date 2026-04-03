"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemberLedger = void 0;
const mongoose_1 = require("mongoose");
const ledgerEntryTypes_1 = require("../../constants/ledgerEntryTypes");
const memberLedgerSchema = new mongoose_1.Schema({
    messId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Mess', required: true },
    messMemberId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'MessMember', required: true },
    type: { type: String, enum: Object.values(ledgerEntryTypes_1.LEDGER_TRANSACTION_TYPES), required: true },
    amount: { type: Number, required: true },
    referenceType: { type: String, enum: Object.values(ledgerEntryTypes_1.REFERENCE_TYPES), required: true },
    referenceId: { type: mongoose_1.Schema.Types.ObjectId, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    isVoided: { type: Boolean, default: false }
}, { timestamps: true, versionKey: false, toJSON: { transform: (_, ret) => { ret.id = ret._id; delete ret._id; return ret; } } });
memberLedgerSchema.index({ messId: 1, messMemberId: 1, date: -1 });
exports.MemberLedger = (0, mongoose_1.model)('MemberLedger', memberLedgerSchema);
