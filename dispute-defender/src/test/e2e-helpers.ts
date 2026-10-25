/**
 * E2E Test Suite Helpers & Fixtures
 * Supporting Dual-Mode Execution (Demo / Sandbox)
 */

import { PayPalDispute, ShipmentTrackingInfo, DisputeMessage } from '../types/dispute';

export interface SlaUrgencyResult {
  hoursLeft: number;
  isUrgent: boolean;   // < 48 hours remaining
  isCritical: boolean; // < 24 hours remaining
  isExpired: boolean;  // <= 0 hours remaining
  badgeText: string;
}

/**
 * Calculates SLA Urgency based on seller response due date
 */
export function calculateSlaUrgency(dueDateStr?: string | null, referenceTime: number = Date.now()): SlaUrgencyResult {
  if (!dueDateStr) {
    return {
      hoursLeft: Infinity,
      isUrgent: false,
      isCritical: false,
      isExpired: false,
      badgeText: 'NO SLA'
    };
  }

  const due = new Date(dueDateStr).getTime();
  const diffMs = due - referenceTime;
  const hoursLeft = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;

  if (hoursLeft <= 0) {
    return {
      hoursLeft,
      isUrgent: true,
      isCritical: true,
      isExpired: true,
      badgeText: 'EXPIRED'
    };
  }

  if (hoursLeft < 24) {
    return {
      hoursLeft,
      isUrgent: true,
      isCritical: true,
      isExpired: false,
      badgeText: `<${Math.ceil(hoursLeft)}H CRITICAL`
    };
  }

  if (hoursLeft <= 48) {
    return {
      hoursLeft,
      isUrgent: true,
      isCritical: false,
      isExpired: false,
      badgeText: `<${Math.ceil(hoursLeft)}H URGENT`
    };
  }

  const days = Math.round(hoursLeft / 24);
  return {
    hoursLeft,
    isUrgent: false,
    isCritical: false,
    isExpired: false,
    badgeText: `${days}D REMAINING`
  };
}

/**
 * Creates a mock PayPal dispute payload for testing
 */
export function createMockDispute(overrides: Partial<PayPalDispute> = {}): PayPalDispute {
  const disputeId = overrides.dispute_id || `PP-D-E2E-${Math.floor(10000 + Math.random() * 90000)}`;
  const now = new Date().toISOString();

  return {
    dispute_id: disputeId,
    create_time: now,
    update_time: now,
    dispute_amount: { currency_code: 'USD', value: '189.00' },
    status: 'WAITING_FOR_SELLER_RESPONSE',
    reason: 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED',
    dispute_life_cycle_stage: 'CHARGEBACK',
    seller_response_due_date: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days left
    allowed_response_options: ['PROVIDE_EVIDENCE', 'ACCEPT_CLAIM'],
    disputed_transactions: [
      {
        seller_transaction_id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        gross_amount: { currency_code: 'USD', value: '189.00' },
        buyer: {
          name: 'Jane Shopper',
          email: 'jane.shopper@example.com',
          phone: { national_number: '555-019-2834' }
        },
        items: [
          {
            item_name: 'Wireless Noise-Canceling Headphones',
            quantity: '1',
            item_cost: { currency_code: 'USD', value: '189.00' }
          }
        ]
      }
    ],
    messages: [
      {
        posted_by: 'BUYER',
        time_posted: now,
        content: 'I ordered the headphones to 123 Main Street, but they never arrived!'
      }
    ],
    links: [
      {
        href: `https://api-m.sandbox.paypal.com/v1/customer/disputes/${disputeId}/provide-evidence`,
        rel: 'provide-evidence',
        method: 'POST'
      },
      {
        href: `https://api-m.sandbox.paypal.com/v1/customer/disputes/${disputeId}/accept-claim`,
        rel: 'accept-claim',
        method: 'POST'
      }
    ],
    ...overrides
  };
}

/**
 * Creates a mock shipment tracking record
 */
export function createMockTracking(overrides: Partial<ShipmentTrackingInfo> = {}): ShipmentTrackingInfo {
  return {
    transaction_id: overrides.transaction_id || `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
    tracking_number: overrides.tracking_number || '122533485',
    carrier: overrides.carrier || 'FEDEX',
    status: overrides.status || 'DELIVERED',
    actual_delivery_date: overrides.actual_delivery_date || new Date(Date.now() - 86400000 * 2).toISOString(),
    ...overrides
  };
}

/**
 * Creates a mock PayPal Webhook event envelope
 */
export function createMockWebhookEvent(dispute: PayPalDispute, eventType = 'CUSTOMER.DISPUTE.CREATED') {
  return {
    id: `WH-EVT-${Math.floor(10000000 + Math.random() * 90000000)}`,
    event_version: '1.0',
    create_time: new Date().toISOString(),
    resource_type: 'dispute',
    event_type: eventType,
    summary: `PayPal Dispute Event: ${eventType} for dispute ${dispute.dispute_id}`,
    resource: dispute
  };
}

/**
 * Simple test assertion utility
 */
export function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}
