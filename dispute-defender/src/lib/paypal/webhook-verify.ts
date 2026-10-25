/**
 * PayPal Webhook Signature Verifier
 * 
 * Verifies that incoming webhooks originate legitimately from PayPal
 * using the /v1/notifications/verify-webhook-signature API.
 */

import { getPayPalAccessToken, getPayPalBaseUrl } from './client';

export interface WebhookVerificationParams {
  authAlgo: string;
  certUrl: string;
  transmissionId: string;
  transmissionSig: string;
  transmissionTime: string;
  webhookId?: string;
  webhookEvent: Record<string, any>;
}

export async function verifyPayPalWebhookSignature(params: WebhookVerificationParams): Promise<boolean> {
  const token = await getPayPalAccessToken();
  const baseUrl = getPayPalBaseUrl();
  const webhookId = params.webhookId || process.env.PAYPAL_WEBHOOK_ID;

  if (!webhookId) {
    console.warn('[Webhook Verifier] PAYPAL_WEBHOOK_ID not set; cannot verify signature.');
    return false;
  }

  const payload = {
    auth_algo: params.authAlgo,
    cert_url: params.certUrl,
    transmission_id: params.transmissionId,
    transmission_sig: params.transmissionSig,
    transmission_time: params.transmissionTime,
    webhook_id: webhookId,
    webhook_event: params.webhookEvent
  };

  const response = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Webhook Verifier] Verification request failed (${response.status}):`, errorText);
    return false;
  }

  const data = await response.json();
  return data.verification_status === 'SUCCESS';
}
