import { config } from '../../config';

export type SSLCommerzInitPayload = {
  tranId: string;
  amount: number;
  currency: string;
  productName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress?: string;
  customerCity?: string;
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
  ipnUrl: string;
};

export type SSLCommerzInitResponse = {
  status?: string;
  failedreason?: string;
  sessionkey?: string;
  GatewayPageURL?: string;
  [key: string]: unknown;
};

export type SSLCommerzValidationResponse = {
  status?: string;
  tran_id?: string;
  val_id?: string;
  amount?: string;
  currency?: string;
  bank_tran_id?: string;
  card_type?: string;
  risk_level?: string;
  risk_title?: string;
  error?: string;
  [key: string]: unknown;
};

const getBaseUrl = () => config.sslcommerz.isSandbox
  ? 'https://sandbox.sslcommerz.com'
  : 'https://securepay.sslcommerz.com';

const assertConfigured = () => {
  if (!config.sslcommerz.storeId || !config.sslcommerz.storePassword) {
    throw new Error('SSLCommerz credentials are not configured');
  }
};

export class SSLCommerzGateway {
  async initiatePayment(payload: SSLCommerzInitPayload): Promise<SSLCommerzInitResponse> {
    assertConfigured();

    const form = new URLSearchParams({
      store_id: config.sslcommerz.storeId,
      store_passwd: config.sslcommerz.storePassword,
      total_amount: String(payload.amount),
      currency: payload.currency,
      tran_id: payload.tranId,
      success_url: payload.successUrl,
      fail_url: payload.failUrl,
      cancel_url: payload.cancelUrl,
      ipn_url: payload.ipnUrl,
      product_name: payload.productName,
      product_category: 'Subscription',
      product_profile: 'general',
      cus_name: payload.customerName,
      cus_email: payload.customerEmail,
      cus_add1: payload.customerAddress || 'N/A',
      cus_city: payload.customerCity || 'Dhaka',
      cus_country: 'Bangladesh',
      cus_phone: payload.customerPhone,
      shipping_method: 'NO',
      num_of_item: '1',
    });

    const response = await fetch(`${getBaseUrl()}/gwprocess/v4/api.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });

    if (!response.ok) throw new Error(`SSLCommerz session initiation failed with HTTP ${response.status}`);
    return response.json() as Promise<SSLCommerzInitResponse>;
  }

  async validatePayment(valId: string): Promise<SSLCommerzValidationResponse> {
    assertConfigured();

    const params = new URLSearchParams({
      val_id: valId,
      store_id: config.sslcommerz.storeId,
      store_passwd: config.sslcommerz.storePassword,
      v: '1',
      format: 'json',
    });

    const response = await fetch(`${getBaseUrl()}/validator/api/validationserverAPI.php?${params.toString()}`);
    if (!response.ok) throw new Error(`SSLCommerz validation failed with HTTP ${response.status}`);
    return response.json() as Promise<SSLCommerzValidationResponse>;
  }
}

export const sslCommerzGateway = new SSLCommerzGateway();
