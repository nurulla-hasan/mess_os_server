export const LEDGER_TRANSACTION_TYPES = {
  CREDIT: 'credit',
  CHARGE: 'charge' // equivalent to debit
} as const;

export const CASH_TRANSACTION_TYPES = {
  IN: 'in',
  OUT: 'out'
} as const;

export const REFERENCE_TYPES = {
  PAYMENT: 'Payment',
  EXPENSE: 'Expense',
  UTILITY_BILL: 'UtilityBill',
  BILLING_CYCLE: 'BillingCycle'
} as const;

export const FUND_SOURCES = {
  MESS_CASH: 'mess_cash',
  PERSONAL_CASH: 'personal_cash'
} as const;
