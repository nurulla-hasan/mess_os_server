import { CashLedger } from '../../modules/ledger/cash-ledger.model';
import { MemberLedger } from '../../modules/ledger/member-ledger.model';
import mongoose from 'mongoose';
import { LEDGER_TRANSACTION_TYPES, CASH_TRANSACTION_TYPES } from '../../constants/ledgerEntryTypes';

export const ledgerHelper = {
  async createCashIn(payload: any, session: mongoose.mongo.ClientSession) {
    return await CashLedger.create([{ ...payload, type: CASH_TRANSACTION_TYPES.IN, isVoided: false }], { session });
  },
  
  async createCashOut(payload: any, session: mongoose.mongo.ClientSession) {
    return await CashLedger.create([{ ...payload, type: CASH_TRANSACTION_TYPES.OUT, isVoided: false }], { session });
  },
  
  async createMemberCredit(payload: any, session: mongoose.mongo.ClientSession) {
    return await MemberLedger.create([{ ...payload, type: LEDGER_TRANSACTION_TYPES.CREDIT, isVoided: false }], { session });
  },
  
  async createMemberCharge(payload: any, session: mongoose.mongo.ClientSession) {
    return await MemberLedger.create([{ ...payload, type: LEDGER_TRANSACTION_TYPES.CHARGE, isVoided: false }], { session });
  },
  
  async bulkCreateMemberCharges(payloads: any[], session: mongoose.mongo.ClientSession) {
    const data = payloads.map(p => ({ ...p, type: LEDGER_TRANSACTION_TYPES.CHARGE, isVoided: false }));
    return await MemberLedger.insertMany(data, { session });
  },
  
  async voidCashEntriesByReference(referenceId: string, referenceType: string, session: mongoose.mongo.ClientSession) {
    await CashLedger.updateMany({ referenceId, referenceType }, { isVoided: true }, { session });
  },
  
  async voidMemberEntriesByReference(referenceId: string, referenceType: string, session: mongoose.mongo.ClientSession) {
    await MemberLedger.updateMany({ referenceId, referenceType }, { isVoided: true }, { session });
  }
};
