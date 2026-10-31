/**
 * Carrier Tracking Intelligence & Auto-Detection Engine
 * 
 * Accurately parses and normalizes major shipping carrier tracking numbers
 * according to official PayPal Carrier Codes and format specifications.
 */

export interface DetectedTracking {
  carrier: 'FEDEX' | 'USPS' | 'UPS' | 'DHL' | 'OTHER';
  trackingNumber: string;
  confidence: number;
  rawCarrierMentioned?: string;
}

export const PAYPAL_CARRIER_ENUMS = {
  FEDEX: 'FEDEX',
  USPS: 'USPS',
  UPS: 'UPS',
  DHL: 'DHL',
  OTHER: 'OTHER'
} as const;

/**
 * Normalizes any freeform or third-party carrier name into PayPal's accepted carrier enum.
 */
export function normalizeCarrierName(carrier: string | undefined): 'FEDEX' | 'USPS' | 'UPS' | 'DHL' | 'OTHER' {
  if (!carrier) return 'OTHER';
  const clean = carrier.toUpperCase().trim();

  if (clean.includes('FEDEX') || clean.includes('FDX')) return 'FEDEX';
  if (clean.includes('USPS') || clean.includes('POST') || clean.includes('UNITED STATES POSTAL')) return 'USPS';
  if (clean.includes('UPS') || clean.includes('UNITED PARCEL SERVICE')) return 'UPS';
  if (clean.includes('DHL') || clean.includes('DEUTSCHE POST')) return 'DHL';

  return 'OTHER';
}

/**
 * Detects carrier and tracking number from structured text, rebuttal notes, or raw message strings.
 */
export function detectCarrierAndTracking(text: string): DetectedTracking | null {
  if (!text || typeof text !== 'string') return null;

  // 1. Explicit keyword + tracking patterns (e.g. "FedEx tracking 122533485" or "USPS tracking #9400111899562534567890")
  const explicitMatch = text.match(/(FedEx|USPS|UPS|DHL|OnTrac)(?:[\s#:\-_]|tracking|number|num|id)+([0-9A-Za-z_-]{7,34})/i);
  if (explicitMatch) {
    const rawCarrier = explicitMatch[1].toUpperCase();
    const trackingNumber = explicitMatch[2].trim();
    const carrier = normalizeCarrierName(rawCarrier);
    return {
      carrier,
      trackingNumber,
      confidence: 95,
      rawCarrierMentioned: explicitMatch[1]
    };
  }

  // 2. UPS 1Z Tracking Pattern (1Z + 16 alphanumeric characters)
  const upsMatch = text.match(/\b(1Z[0-9A-Z]{16})\b/i);
  if (upsMatch) {
    return {
      carrier: 'UPS',
      trackingNumber: upsMatch[1].toUpperCase(),
      confidence: 99
    };
  }

  // 3. USPS 20-30 digit domestic barcode or Electronic Confirmation
  const uspsMatch = text.match(/\b(9[234][0-9]{18,30})\b/);
  if (uspsMatch) {
    return {
      carrier: 'USPS',
      trackingNumber: uspsMatch[1],
      confidence: 95
    };
  }

  // 4. DHL Express Format (typically 10 numeric digits or DHL- prefix)
  const dhlMatch = text.match(/\b(?:DHL-)?([0-9]{10})\b/i);
  if (dhlMatch && text.toLowerCase().includes('dhl')) {
    return {
      carrier: 'DHL',
      trackingNumber: dhlMatch[0],
      confidence: 90
    };
  }

  // 5. FedEx Ground / Express standard 12, 14, or 15 digit patterns
  const fedexMatch = text.match(/\b([0-9]{12,15})\b/);
  if (fedexMatch && (text.toLowerCase().includes('fedex') || text.toLowerCase().includes('delivery'))) {
    return {
      carrier: 'FEDEX',
      trackingNumber: fedexMatch[1],
      confidence: 85
    };
  }

  return null;
}

/**
 * Validates tracking number format syntax against expected carrier specifications.
 */
export function validateTrackingNumber(carrier: string, trackingNumber: string): boolean {
  if (!trackingNumber || trackingNumber.length < 6) return false;
  const c = normalizeCarrierName(carrier);

  switch (c) {
    case 'UPS':
      return /^1Z[0-9A-Z]{16}$/i.test(trackingNumber) || /^[0-9]{9,12}$/.test(trackingNumber);
    case 'USPS':
      return /^[0-9]{20,34}$/.test(trackingNumber) || /^[A-Z]{2}[0-9]{9}[A-Z]{2}$/i.test(trackingNumber);
    case 'FEDEX':
      return /^[0-9]{12,15}$/.test(trackingNumber) || /^[0-9]{20,22}$/.test(trackingNumber);
    case 'DHL':
      return /^[0-9]{10}$/.test(trackingNumber) || /^DHL-[0-9A-Za-z-]+$/i.test(trackingNumber);
    case 'OTHER':
    default:
      return trackingNumber.length >= 6;
  }
}
