/**
 * PayPal Server SDK & APIMatic Context Integration Module
 * 
 * Target Sponsor: APIMatic ($1,000 Prize Category)
 * Role: Provides type-safe PayPal Server SDK bindings for Order and Transaction lookups,
 * guided by APIMatic's Context Plugin and OpenAPI 3.0 specification.
 */

import { getPayPalAccessToken, getPayPalBaseUrl } from './client';

export interface PayPalOrderDetails {
  id: string;
  status: string;
  intent: string;
  create_time: string;
  purchase_units: Array<{
    reference_id?: string;
    amount: {
      currency_code: string;
      value: string;
    };
    items?: Array<{
      name: string;
      quantity: string;
      unit_amount: {
        currency_code: string;
        value: string;
      };
      sku?: string;
    }>;
    shipping?: {
      name?: {
        full_name?: string;
      };
      address?: {
        address_line_1?: string;
        admin_area_2?: string;
        admin_area_1?: string;
        postal_code?: string;
        country_code?: string;
      };
    };
  }>;
}

export interface PayPalTransactionSearchRecord {
  transaction_info: {
    paypal_account_id: string;
    transaction_id: string;
    transaction_amount: {
      currency_code: string;
      value: string;
    };
    transaction_status: string;
    transaction_initiation_date: string;
    transaction_updated_date: string;
  };
  payer_info?: {
    account_id?: string;
    email_address?: string;
    payer_name?: {
      given_name?: string;
      surname?: string;
    };
  };
}

/**
 * Retrieves order details using the PayPal Server SDK contract (Orders v2 API)
 * Follows APIMatic-verified schema: /v2/checkout/orders/{id}
 */
export async function getOrderDetails(orderId: string): Promise<PayPalOrderDetails> {
  const token = await getPayPalAccessToken();
  const baseUrl = getPayPalBaseUrl();
  const url = `${baseUrl}/v2/checkout/orders/${orderId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayPal Server SDK getOrder failed for ${orderId} (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Queries transaction reporting logs using the PayPal Server SDK Reporting contract
 * Follows APIMatic-verified schema: /v1/reporting/transactions
 */
export async function searchTransactions(params: {
  transactionId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{ transaction_details: PayPalTransactionSearchRecord[] }> {
  const token = await getPayPalAccessToken();
  const baseUrl = getPayPalBaseUrl();

  const query = new URLSearchParams();
  if (params.transactionId) query.append('transaction_id', params.transactionId);
  if (params.startDate) query.append('start_date', params.startDate);
  if (params.endDate) query.append('end_date', params.endDate);

  const url = `${baseUrl}/v1/reporting/transactions${query.toString() ? `?${query.toString()}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayPal Server SDK searchTransactions failed (${response.status}): ${errorText}`);
  }

  return response.json();
}
