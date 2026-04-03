"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FUND_SOURCES = exports.REFERENCE_TYPES = exports.CASH_TRANSACTION_TYPES = exports.LEDGER_TRANSACTION_TYPES = void 0;
exports.LEDGER_TRANSACTION_TYPES = {
    CREDIT: 'credit',
    CHARGE: 'charge' // equivalent to debit
};
exports.CASH_TRANSACTION_TYPES = {
    IN: 'in',
    OUT: 'out'
};
exports.REFERENCE_TYPES = {
    PAYMENT: 'Payment',
    EXPENSE: 'Expense',
    UTILITY_BILL: 'UtilityBill',
    BILLING_CYCLE: 'BillingCycle'
};
exports.FUND_SOURCES = {
    MESS_CASH: 'mess_cash',
    PERSONAL_CASH: 'personal_cash'
};
