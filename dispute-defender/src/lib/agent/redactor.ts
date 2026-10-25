/**
 * Zero-Trust PII Redaction Engine
 * 
 * Cleanses all sensitive buyer Personal Identifiable Information (PII)
 * before any context payload is delivered to an external LLM.
 */

import { DisputeContextBundle, RedactedContextBundle } from '../../types/dispute';

// Email regex pattern
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

// Phone number regex pattern (US, International, Formatted, and Strict 10/11-digit Unformatted)
// Strictly bounds digits to prevent matching 9, 12, 15, 18, 20, 22-digit carrier tracking numbers
const PHONE_REGEX = /(?<![A-Za-z0-9])(?:\+?\d{1,4}[-.\s])?(?:\(?\d{2,4}\)?[-.\s])\d{3,4}[-.\s]\d{4}(?![A-Za-z0-9])|(?<![A-Za-z0-9])\(\d{2,4}\)\s*\d{3,4}[-.\s]?\d{4}(?![A-Za-z0-9])|(?<!\d)(?:1\d{10}|\d{10})(?!\d)/g;

// IPv4 and IPv6 regex (supports standard IPv4, full 8-hextet IPv6, and compressed IPv6 including ::1)
const IP_REGEX = /\b(?:\d{1,3}\.){3}\d{1,3}\b|::1\b|(?:::)?(?:[0-9a-fA-F]{1,4}:){1,7}[0-9a-fA-F]{1,4}\b/g;

const SUFFIXES = 'Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Crt|Way|Square|Sq|Trail|Trl|Parkway|Pkwy|Terrace|Ter|Circle|Cir|Place|Pl|Highway|Hwy|Loop|Crescent|Cres|Alley|Aly|Row|Run|Path|Walk|Plaza|Plz|Crossing|Xing|Close|Heights|Hts';
const UNIT_SPECIFIERS = 'Apt|Apartment|Suite|Ste|Unit|Room|Rm|#';

// Street address pattern:
// 1. House number (1-5 digits), strictly guarded against currency ($) and decimals (.)
// 2. 1 to 4 street name tokens (words/ordinals, cannot contain standalone multi-digit numbers)
// 3. Suffix with leading and trailing word boundaries
// 4. Optional unit specifier with optional period/comma/whitespace
const ADDRESS_REGEX = new RegExp(
  `(?<![\\$.,\\d])\\b\\d{1,5}\\s+(?:(?!\\d{2,}\\b)[A-Za-z0-9#.-]+[\\s]+){1,4}\\b(?:${SUFFIXES})\\b(?:\\.?\\s*,?\\s*(?:${UNIT_SPECIFIERS})\\.?\\s*[A-Za-z0-9-]+)?`,
  'gi'
);

export interface RedactionResult {
  sanitizedText: string;
  replacements: {
    emails: number;
    phones: number;
    ips: number;
    addresses: number;
    names: number;
  };
}

/**
 * Sanitizes arbitrary text string by masking PII tokens
 */
export function sanitizeText(text: string, knownBuyerNames: string[] = []): RedactionResult {
  if (!text) return { sanitizedText: '', replacements: { emails: 0, phones: 0, ips: 0, addresses: 0, names: 0 } };

  let sanitized = text;
  let emails = 0;
  let phones = 0;
  let ips = 0;
  let addresses = 0;
  let names = 0;

  // Mask Emails
  sanitized = sanitized.replace(EMAIL_REGEX, () => {
    emails++;
    return '[EMAIL_REDACTED]';
  });

  // Mask IP Addresses FIRST (before phone/address)
  sanitized = sanitized.replace(IP_REGEX, () => {
    ips++;
    return '[IP_REDACTED]';
  });

  // Mask Phone numbers
  sanitized = sanitized.replace(PHONE_REGEX, (match) => {
    // Guard against ISO dates (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(match)) {
      return match;
    }
    phones++;
    return '[PHONE_REDACTED]';
  });

  // Mask Street Addresses
  sanitized = sanitized.replace(ADDRESS_REGEX, () => {
    addresses++;
    return '[STREET_ADDRESS_REDACTED]';
  });

  // Mask Known Buyer Names
  for (const name of knownBuyerNames) {
    if (name && name.trim().length > 2) {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const nameRegex = new RegExp(`\\b${escapedName}\\b`, 'gi');
      sanitized = sanitized.replace(nameRegex, () => {
        names++;
        return '[BUYER_NAME_REDACTED]';
      });
    }
  }

  return {
    sanitizedText: sanitized,
    replacements: { emails, phones, ips, addresses, names }
  };
}

/**
 * Transforms an entire raw DisputeContextBundle into a privacy-guaranteed RedactedContextBundle
 */
export function sanitizeDisputeContext(context: DisputeContextBundle): RedactedContextBundle {
  const { dispute, shipmentTracking, buyerMessages, order } = context;

  // Extract known buyer names from dispute transactions
  const buyerNames: string[] = [];
  dispute.disputed_transactions?.forEach(tx => {
    if (tx.buyer?.name) buyerNames.push(tx.buyer.name);
  });

  let totalEmails = 0;
  let totalPhones = 0;
  let totalIps = 0;
  let totalAddresses = 0;
  let totalNames = 0;

  // Sanitize Messages
  const rawMessages = (buyerMessages && buyerMessages.length > 0)
    ? buyerMessages
    : (dispute.messages || []);

  const sanitizedMessages = rawMessages.map(msg => {
    const result = sanitizeText(msg.content, buyerNames);
    totalEmails += result.replacements.emails;
    totalPhones += result.replacements.phones;
    totalIps += result.replacements.ips;
    totalAddresses += result.replacements.addresses;
    totalNames += result.replacements.names;

    return {
      from: msg.posted_by || (msg as any).from || 'BUYER',
      date: msg.time_posted || (msg as any).date || '',
      content: result.sanitizedText
    };
  });

  // Sanitize Shipment Tracking (preserve tracking numbers, carrier names, and statuses)
  const sanitizedShipmentInfo = (shipmentTracking || []).map(track => ({
    carrier: track.carrier || track.carrier_name_other || 'UNKNOWN_CARRIER',
    trackingNumber: track.tracking_number,
    status: track.status,
    deliveryDate: track.actual_delivery_date || track.estimated_delivery_date
  }));

  // Sanitize Order Info (preserve items, prices, SKUs; strip recipient shipping name and address)
  const sanitizedOrderInfo: Record<string, any> = {
    orderId: order?.id || dispute.disputed_transactions?.[0]?.seller_transaction_id,
    grossAmount: dispute.dispute_amount,
    items: dispute.disputed_transactions?.[0]?.items?.map(item => ({
      name: item.item_name,
      quantity: item.quantity,
      cost: item.item_cost
    })) || []
  };

  return {
    disputeId: dispute.dispute_id,
    reason: dispute.reason,
    amount: dispute.dispute_amount.value,
    currency: dispute.dispute_amount.currency_code,
    dueDate: dispute.seller_response_due_date,
    lifeCycleStage: dispute.dispute_life_cycle_stage,
    allowedResponseOptions: dispute.allowed_response_options || [],
    sanitizedOrderInfo,
    sanitizedShipmentInfo,
    sanitizedMessages,
    redactionAudit: {
      emailsRedactedCount: totalEmails,
      namesRedactedCount: totalNames,
      phonesRedactedCount: totalPhones,
      addressesRedactedCount: totalAddresses
    }
  };
}
