/**
 * Unit Tests for Zero-Trust PII Redaction Engine
 */

import { sanitizeText, sanitizeDisputeContext } from '../lib/agent/redactor';
import { DisputeContextBundle } from '../types/dispute';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

function runTests() {
  console.log('=== Running Zero-Trust Redactor Unit Tests ===');

  // Test 1: Email Redaction
  {
    const sample = 'Contact customer at alex.buyer@example.com or support@merchant.store';
    const res = sanitizeText(sample);
    assert(
      !res.sanitizedText.includes('alex.buyer@example.com'),
      'Customer email was not redacted!'
    );
    assert(
      res.sanitizedText.includes('[EMAIL_REDACTED]'),
      'Missing [EMAIL_REDACTED] token!'
    );
    assert(res.replacements.emails === 2, `Expected 2 emails redacted, got ${res.replacements.emails}`);
    console.log('✓ Test 1 Passed: Email Masking');
  }

  // Test 2: Phone Number Redaction
  {
    const sample = 'Buyer telephone is (555) 234-5678 or +1-800-555-0199.';
    const res = sanitizeText(sample);
    assert(!res.sanitizedText.includes('(555) 234-5678'), 'Phone number leaked!');
    assert(res.replacements.phones === 2, 'Phone replacements count mismatch');
    console.log('✓ Test 2 Passed: Phone Number Masking');
  }

  // Test 3: Street Address Redaction
  {
    const sample = 'Delivery address was 742 Evergreen Terrace, Springfield, OR. Backup: 100 Innovation Way, 55 Ocean Circle, and 88 Metro Highway Apt 4B.';
    const res = sanitizeText(sample);
    assert(!res.sanitizedText.includes('742 Evergreen Terrace'), 'Street address leaked!');
    assert(!res.sanitizedText.includes('100 Innovation Way'), 'Way address leaked!');
    assert(!res.sanitizedText.includes('55 Ocean Circle'), 'Circle address leaked!');
    assert(!res.sanitizedText.includes('88 Metro Highway Apt 4B'), 'Highway address leaked!');
    assert(res.sanitizedText.includes('[STREET_ADDRESS_REDACTED]'), 'Missing address token!');
    assert(res.replacements.addresses === 4, `Expected 4 addresses redacted, got ${res.replacements.addresses}`);
    console.log('✓ Test 3 Passed: Street Address Masking (Terrace, Way, Circle, Highway, Apt)');
  }

  // Test 4: Known Buyer Name Redaction
  {
    const sample = 'Buyer Sarah Connor filed a dispute stating she never ordered this.';
    const res = sanitizeText(sample, ['Sarah Connor']);
    assert(!res.sanitizedText.includes('Sarah Connor'), 'Buyer name leaked!');
    assert(res.sanitizedText.includes('[BUYER_NAME_REDACTED]'), 'Missing name token!');
    console.log('✓ Test 4 Passed: Buyer Name Masking');
  }

  // Test 5: Full Bundle Context Sanitization & Field Preservation
  {
    const bundle: DisputeContextBundle = {
      dispute: {
        dispute_id: 'PP-D-TEST-100',
        create_time: '2026-10-26T00:00:00Z',
        update_time: '2026-10-26T00:00:00Z',
        dispute_amount: { currency_code: 'USD', value: '150.00' },
        status: 'WAITING_FOR_SELLER_RESPONSE',
        reason: 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED',
        dispute_life_cycle_stage: 'CHARGEBACK',
        allowed_response_options: ['PROVIDE_EVIDENCE'],
        disputed_transactions: [
          {
            seller_transaction_id: 'TX-ORDER-77',
            gross_amount: { currency_code: 'USD', value: '150.00' },
            buyer: {
              name: 'Bruce Wayne',
              email: 'bruce@wayneenterprises.com',
              phone: { national_number: '555-123-4567' }
            }
          }
        ],
        messages: [
          {
            posted_by: 'BUYER',
            time_posted: '2026-10-26T00:00:00Z',
            content: 'I, Bruce Wayne, did not receive item at 1007 Mountain Drive, Gotham. Contact me at bruce@wayneenterprises.com.'
          }
        ]
      },
      shipmentTracking: [
        {
          transaction_id: 'TX-ORDER-77',
          tracking_number: '1Z9999999999999999',
          carrier: 'UPS',
          status: 'DELIVERED',
          actual_delivery_date: '2026-10-25T12:00:00Z'
        }
      ],
      buyerMessages: [],
      rawDisputeJson: '{}'
    };

    const sanitized = sanitizeDisputeContext(bundle);

    // Verify PII is masked
    const messageContent = sanitized.sanitizedMessages[0].content;
    assert(!messageContent.includes('Bruce Wayne'), 'Buyer name leaked in message!');
    assert(!messageContent.includes('bruce@wayneenterprises.com'), 'Email leaked in message!');
    assert(!messageContent.includes('1007 Mountain Drive'), 'Address leaked in message!');

    // Verify Carrier and Tracking are preserved!
    assert(sanitized.sanitizedShipmentInfo[0].carrier === 'UPS', 'Carrier name lost!');
    assert(sanitized.sanitizedShipmentInfo[0].trackingNumber === '1Z9999999999999999', 'Tracking number lost!');
    assert(sanitized.sanitizedShipmentInfo[0].status === 'DELIVERED', 'Status lost!');

    // Verify Dispute facts preserved
    assert(sanitized.amount === '150.00', 'Amount corrupted');
    assert(sanitized.currency === 'USD', 'Currency corrupted');

    console.log('✓ Test 5 Passed: Full Context Bundle Sanitization & Preservation');
  }

  console.log('=== All Redactor Unit Tests Passed Successfully (5/5) ===');
}

runTests();
