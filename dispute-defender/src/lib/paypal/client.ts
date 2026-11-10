/**
 * PayPal OAuth 2.0 Client & Token Manager
 * Features:
 * - In-memory token caching
 * - Proactive renewal before expiration (5-minute safety buffer)
 * - Automatic sandbox vs live endpoint resolution
 */

import { getEnv } from '@/lib/env';

interface CachedToken {
  accessToken: string;
  expiresAt: number; // Unix epoch ms
  tokenType: string;
}

let tokenCache: CachedToken | null = null;

export function getPayPalBaseUrl(): string {
  const currentEnv = getEnv().PAYPAL_ENV;
  return currentEnv === 'live' 
    ? 'https://api-m.paypal.com' 
    : 'https://api-m.sandbox.paypal.com';
}

export async function getPayPalAccessToken(): Promise<string> {
  const currentEnv = getEnv();
  const clientId = currentEnv.PAYPAL_CLIENT_ID;
  const clientSecret = currentEnv.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing PayPal credentials: Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in your environment or .env file.'
    );
  }

  const now = Date.now();
  // Check if cached token is still valid (with 5-minute safety threshold)
  if (tokenCache && tokenCache.expiresAt > now + 5 * 60 * 1000) {
    return tokenCache.accessToken;
  }

  const baseUrl = getPayPalBaseUrl();
  const tokenUrl = `${baseUrl}/v1/oauth2/token`;
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to acquire PayPal OAuth token (${response.status}): ${errorText}`
    );
  }

  const data = await response.json();
  const expiresInSeconds = data.expires_in || 3600;

  tokenCache = {
    accessToken: data.access_token,
    expiresAt: now + expiresInSeconds * 1000,
    tokenType: data.token_type || 'Bearer'
  };

  return tokenCache.accessToken;
}

/**
 * Resets the in-memory token cache (useful for testing and recovery)
 */
export function clearTokenCache(): void {
  tokenCache = null;
}
