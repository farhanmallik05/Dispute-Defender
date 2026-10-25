/**
 * PayPal Customer Disputes REST API Client
 * 
 * Bridges the gap in the PayPal Agent Toolkit by implementing:
 * - provide-evidence (multipart/form-data with input JSON payload)
 * - accept-claim
 * - list-disputes and show-dispute-details
 * - sandbox adjudication and require-evidence simulation
 */

import { getPayPalAccessToken, getPayPalBaseUrl } from './client';
import { PayPalDispute } from '../../types/dispute';

export interface SubmitEvidenceParams {
  disputeId: string;
  evidenceType: 'PROOF_OF_FULFILLMENT' | 'PROOF_OF_REFUND' | 'OTHER';
  trackingNumber?: string;
  carrierName?: string;
  notes: string;
}

export interface AcceptClaimParams {
  disputeId: string;
  note?: string;
  acceptClaimType?: 'REFUND' | 'REFUND_WITH_RETURN' | 'REFUND_WITH_REPLACEMENT';
}

/**
 * Checks HATEOAS links provided in the dispute response to ensure an action is legally allowed.
 * Supports both hyphenated ('provide-evidence') and underscored ('provide_evidence') link relations.
 */
export function getDisputeActionLinks(dispute: PayPalDispute) {
  const links = dispute?.links || [];
  return {
    canProvideEvidence: links.some(l => l.rel === 'provide-evidence' || l.rel === 'provide_evidence'),
    canAcceptClaim: links.some(l => l.rel === 'accept-claim' || l.rel === 'accept_claim'),
    canMakeOffer: links.some(l => l.rel === 'make-offer' || l.rel === 'make_offer'),
    canAppeal: links.some(l => l.rel === 'appeal'),
    provideEvidenceUrl: links.find(l => l.rel === 'provide-evidence' || l.rel === 'provide_evidence')?.href,
    acceptClaimUrl: links.find(l => l.rel === 'accept-claim' || l.rel === 'accept_claim')?.href
  };
}

/**
 * Validates whether a specific action is permitted on the dispute per HATEOAS links.
 */
export function isActionAllowed(
  dispute: PayPalDispute,
  action: 'provide-evidence' | 'provide_evidence' | 'accept-claim' | 'accept_claim' | 'make-offer' | 'make_offer' | 'appeal' | string
): boolean {
  const links = dispute?.links || [];
  const normalizedAction = action.toLowerCase().replace(/_/g, '-');
  return links.some(l => {
    const relNorm = l.rel ? l.rel.toLowerCase().replace(/_/g, '-') : '';
    return relNorm === normalizedAction;
  });
}

/**
 * Fetches open disputes from PayPal
 */
export async function listPayPalDisputes(params?: {
  disputeState?: string;
  pageSize?: number;
}): Promise<{ items: PayPalDispute[]; total_items?: number }> {
  const token = await getPayPalAccessToken();
  const baseUrl = getPayPalBaseUrl();
  
  const query = new URLSearchParams();
  if (params?.disputeState) query.append('dispute_state', params.disputeState);
  if (params?.pageSize) query.append('page_size', params.pageSize.toString());

  const url = `${baseUrl}/v1/customer/disputes${query.toString() ? `?${query.toString()}` : ''}`;

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
    throw new Error(`PayPal list_disputes failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Fetches a single dispute by ID
 */
export async function getPayPalDispute(disputeId: string): Promise<PayPalDispute> {
  const token = await getPayPalAccessToken();
  const baseUrl = getPayPalBaseUrl();
  const url = `${baseUrl}/v1/customer/disputes/${disputeId}`;

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
    throw new Error(`PayPal get_dispute failed for ${disputeId} (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Submits evidence to defend a dispute via multipart/form-data.
 * NOTE: The PayPal Disputes API requires the JSON payload inside an 'input' form field.
 */
export async function submitDisputeEvidence(params: SubmitEvidenceParams): Promise<any> {
  const token = await getPayPalAccessToken();
  const baseUrl = getPayPalBaseUrl();
  const url = `${baseUrl}/v1/customer/disputes/${params.disputeId}/provide-evidence`;

  const inputPayload = {
    evidences: [
      {
        evidence_type: params.evidenceType,
        evidence_info: params.trackingNumber ? {
          tracking_info: [
            {
              carrier_name: params.carrierName || 'OTHER',
              tracking_number: params.trackingNumber
            }
          ]
        } : undefined,
        notes: params.notes
      }
    ]
  };

  const formData = new FormData();
  formData.append('input', JSON.stringify(inputPayload));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
      // Note: Node fetch / native fetch automatically sets multipart/form-data boundary with FormData
    },
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `PayPal provide-evidence failed for ${params.disputeId} (${response.status}): ${errorText}`
    );
  }

  // 200 OK or 204 No Content
  if (response.status === 204) {
    return { success: true, disputeId: params.disputeId };
  }

  return response.json();
}

/**
 * Accepts a dispute claim, refunding the buyer
 */
export async function acceptPayPalDisputeClaim(params: AcceptClaimParams): Promise<any> {
  const token = await getPayPalAccessToken();
  const baseUrl = getPayPalBaseUrl();
  const url = `${baseUrl}/v1/customer/disputes/${params.disputeId}/accept-claim`;

  const body: Record<string, any> = {
    accept_claim_type: params.acceptClaimType || 'REFUND'
  };
  if (params.note) body.note = params.note;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `PayPal accept-claim failed for ${params.disputeId} (${response.status}): ${errorText}`
    );
  }

  if (response.status === 204) {
    return { success: true, disputeId: params.disputeId };
  }

  return response.json();
}

/**
 * SANDBOX ONLY: Forces a dispute state advancement for demo purposes
 */
export async function requireSandboxEvidence(disputeId: string): Promise<any> {
  const token = await getPayPalAccessToken();
  const baseUrl = getPayPalBaseUrl();
  const url = `${baseUrl}/v1/customer/disputes/${disputeId}/require-evidence`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ action: 'BUYER_EVIDENCE' })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sandbox require-evidence failed (${response.status}): ${errorText}`);
  }

  return response.status === 204 ? { success: true } : response.json();
}
