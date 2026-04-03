"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ledgerHelper = void 0;
const cash_ledger_model_1 = require("../../modules/ledger/cash-ledger.model");
const member_ledger_model_1 = require("../../modules/ledger/member-ledger.model");
const ledgerEntryTypes_1 = require("../../constants/ledgerEntryTypes");
exports.ledgerHelper = {
    async createCashIn(payload, session) {
        return await cash_ledger_model_1.CashLedger.create([{ ...payload, type: ledgerEntryTypes_1.CASH_TRANSACTION_TYPES.IN, isVoided: false }], { session });
    },
    async createCashOut(payload, session) {
        return await cash_ledger_model_1.CashLedger.create([{ ...payload, type: ledgerEntryTypes_1.CASH_TRANSACTION_TYPES.OUT, isVoided: false }], { session });
    },
    async createMemberCredit(payload, session) {
        return await member_ledger_model_1.MemberLedger.create([{ ...payload, type: ledgerEntryTypes_1.LEDGER_TRANSACTION_TYPES.CREDIT, isVoided: false }], { session });
    },
    async createMemberCharge(payload, session) {
        return await member_ledger_model_1.MemberLedger.create([{ ...payload, type: ledgerEntryTypes_1.LEDGER_TRANSACTION_TYPES.CHARGE, isVoided: false }], { session });
    },
    async bulkCreateMemberCharges(payloads, session) {
        const data = payloads.map(p => ({ ...p, type: ledgerEntryTypes_1.LEDGER_TRANSACTION_TYPES.CHARGE, isVoided: false }));
        return await member_ledger_model_1.MemberLedger.insertMany(data, { session });
    },
    async voidCashEntriesByReference(referenceId, referenceType, session) {
        await cash_ledger_model_1.CashLedger.updateMany({ referenceId, referenceType }, { isVoided: true }, { session });
    },
    async voidMemberEntriesByReference(referenceId, referenceType, session) {
        await member_ledger_model_1.MemberLedger.updateMany({ referenceId, referenceType }, { isVoided: true }, { session });
    }
};
