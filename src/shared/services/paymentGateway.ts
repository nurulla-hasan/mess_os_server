export interface PaymentGateway {
  chargeTokens(token: string, amount: number): Promise<{ success: boolean; transactionId?: string; error?: string }>;
}

class StripePlaceholder implements PaymentGateway {
  async chargeTokens(token: string, amount: number) {
    if (token === 'success_tok') return { success: true, transactionId: 'txn_mock_' + Date.now() };
    return { success: false, error: 'External integration not fully hooked up. Provide success_tok to mock locally per abstract guidelines.' };
  }
}

export const paymentGateway: PaymentGateway = new StripePlaceholder();
