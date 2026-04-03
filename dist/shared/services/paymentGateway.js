"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentGateway = void 0;
class StripePlaceholder {
    async chargeTokens(token, amount) {
        if (token === 'success_tok')
            return { success: true, transactionId: 'txn_mock_' + Date.now() };
        return { success: false, error: 'External integration not fully hooked up. Provide success_tok to mock locally per abstract guidelines.' };
    }
}
exports.paymentGateway = new StripePlaceholder();
