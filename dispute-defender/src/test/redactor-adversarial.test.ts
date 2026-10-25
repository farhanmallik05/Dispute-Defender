/**
 * Adversarial Empirical Test Suite for Zero-Trust Redactor
 * 
 * Tests boundary cases, edge cases, tracking preservation, financial figure preservation,
 * and PII leakage across adversarial inputs.
 */

import { sanitizeText, sanitizeDisputeContext } from '../lib/agent/redactor';
import { DisputeContextBundle } from '../types/dispute';

interface TestResult {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  error?: string;
}

const results: TestResult[] = [];

function expectMatch(name: string, actual: string, condition: boolean, expectedDesc: string) {
  if (condition) {
    results.push({ name, passed: true, expected: expectedDesc, actual });
    console.log(`  ✓ PASS: ${name}`);
  } else {
    results.push({ name, passed: false, expected: expectedDesc, actual, error: `Condition failed. Actual: "${actual}"` });
    console.error(`  ✗ FAIL: ${name}\n    Expected: ${expectedDesc}\n    Actual:   "${actual}"`);
  }
}

console.log('================================================================');
console.log('=== EMPIRICAL ADVERSARIAL STRESS TEST FOR REDACTOR ENGINE ===');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// Category 1: Tracking Number Preservation in Messages and Text
// -----------------------------------------------------------------------------
console.log('--- Category 1: Tracking Number Preservation ---');

const trackingCases = [
  { name: 'USPS 22-digit Tracking', input: 'Shipped via USPS with tracking 9400111899562534567890 on Monday', tracking: '9400111899562534567890' },
  { name: 'USPS 20-digit Tracking', input: 'Package 92055000000000000000 has arrived', tracking: '92055000000000000000' },
  { name: 'FedEx 12-digit Tracking', input: 'Carrier FedEx tracking number is 122533485012', tracking: '122533485012' },
  { name: 'FedEx 15-digit Tracking', input: 'FedEx Express 961101900000000 in transit', tracking: '961101900000000' },
  { name: 'UPS 1Z Tracking', input: 'UPS tracking number 1Z9999999999999999 is delivered', tracking: '1Z9999999999999999' },
  { name: 'Short Tracking 122533485', input: 'Reference tracking 122533485 confirmed', tracking: '122533485' },
];

for (const tc of trackingCases) {
  const res = sanitizeText(tc.input);
  expectMatch(
    tc.name,
    res.sanitizedText,
    res.sanitizedText.includes(tc.tracking) && !res.sanitizedText.includes('[PHONE_REDACTED]'),
    `Must preserve tracking number "${tc.tracking}" without false-positive phone redaction`
  );
}

// -----------------------------------------------------------------------------
// Category 2: Financial Amount Preservation & Overmatching Resistance
// -----------------------------------------------------------------------------
console.log('\n--- Category 2: Financial Amount & Narrative Text Preservation ---');

const financialCases = [
  {
    name: 'Dispute sentence with dollar amount before address',
    input: 'Payment of $150.00 for order 2450 was delivered to 100 Main Street',
    mustInclude: ['$150.00', 'order 2450', '[STREET_ADDRESS_REDACTED]'],
    mustNotInclude: ['100 Main Street']
  },
  {
    name: 'Dispute sentence with plain number of dollars before address',
    input: 'Payment of 50 dollars for delivery to 100 Main Street',
    mustInclude: ['50 dollars', '[STREET_ADDRESS_REDACTED]'],
    mustNotInclude: ['100 Main Street']
  },
  {
    name: 'Dispute claim narrative: items damaged before address',
    input: 'Buyer claimed 2 items were damaged. Sent to 742 Evergreen Terrace',
    mustInclude: ['2 items were damaged', '[STREET_ADDRESS_REDACTED]'],
    mustNotInclude: ['742 Evergreen Terrace']
  },
  {
    name: 'Order quantity and fee before address',
    input: 'Purchased 3 units for 99 USD delivered to 555 King Crescent',
    mustInclude: ['3 units', '99 USD', '[STREET_ADDRESS_REDACTED]'],
    mustNotInclude: ['555 King Crescent']
  }
];

for (const fc of financialCases) {
  const res = sanitizeText(fc.input);
  const includedAll = fc.mustInclude.every(s => res.sanitizedText.includes(s));
  const excludedAll = fc.mustNotInclude.every(s => !res.sanitizedText.includes(s));
  expectMatch(
    fc.name,
    res.sanitizedText,
    includedAll && excludedAll,
    `Must include: ${JSON.stringify(fc.mustInclude)} and exclude: ${JSON.stringify(fc.mustNotInclude)}`
  );
}

// -----------------------------------------------------------------------------
// Category 3: Street Address Boundary & Variant Redaction
// -----------------------------------------------------------------------------
console.log('\n--- Category 3: Street Address Boundary & Variant Redaction ---');

const addressCases = [
  { name: '100 Ocean Parkway Apt 4B', input: 'Ship to 100 Ocean Parkway Apt 4B immediately', leaked: '100 Ocean Parkway Apt 4B' },
  { name: '123 Main St, Apt 4B (with comma)', input: 'Sent to 123 Main St, Apt 4B for review', leaked: 'Apt 4B' },
  { name: '123 Main St., Suite 200 (period and comma)', input: 'Office at 123 Main St., Suite 200 today', leaked: 'Suite 200' },
  { name: '555 King Crescent Suite 12', input: 'Delivered to 555 King Crescent Suite 12 yesterday', leaked: '555 King Crescent Suite 12' },
  { name: '12 Industrial Hwy', input: 'Warehouse is at 12 Industrial Hwy near port', leaked: '12 Industrial Hwy' },
  { name: '99 Country Club Road', input: 'Residential drop at 99 Country Club Road', leaked: '99 Country Club Road' },
  { name: 'Multiline address with newline', input: 'Address is:\n123 Main Street\nApartment 4B\nSeattle', leaked: '123 Main Street' }
];

for (const ac of addressCases) {
  const res = sanitizeText(ac.input);
  expectMatch(
    ac.name,
    res.sanitizedText,
    !res.sanitizedText.includes(ac.leaked) && res.sanitizedText.includes('[STREET_ADDRESS_REDACTED]'),
    `Must redact address without leaking "${ac.leaked}"`
  );
}

// -----------------------------------------------------------------------------
// Category 4: International & Complex Phone Numbers
// -----------------------------------------------------------------------------
console.log('\n--- Category 4: Phone Redaction & Dates Preservation ---');

const phoneCases = [
  { name: 'Standard US Phone', input: 'Call me at 555-123-4567 please', redacted: '[PHONE_REDACTED]', leaked: '555-123-4567' },
  { name: 'Parenthesized Phone', input: 'Call me at (555) 123-4567 please', redacted: '[PHONE_REDACTED]', leaked: '(555) 123-4567' },
  { name: 'Dotted Phone', input: 'Call 555.123.4567 today', redacted: '[PHONE_REDACTED]', leaked: '555.123.4567' },
  { name: 'International Phone +44', input: 'UK number is +44 20 7946 0958 call now', redacted: '[PHONE_REDACTED]', leaked: '7946 0958' },
  { name: 'Preserve ISO Date (Not Phone)', input: 'Event happened on 2026-10-25 at 14:00', date: '2026-10-25' }
];

for (const pc of phoneCases) {
  const res = sanitizeText(pc.input);
  if (pc.date) {
    expectMatch(
      pc.name,
      res.sanitizedText,
      res.sanitizedText.includes(pc.date) && !res.sanitizedText.includes('[PHONE_REDACTED]'),
      `Must preserve date "${pc.date}" without false-positive phone redaction`
    );
  } else {
    expectMatch(
      pc.name,
      res.sanitizedText,
      !res.sanitizedText.includes(pc.leaked!) && res.sanitizedText.includes(pc.redacted!),
      `Must redact phone without leaking "${pc.leaked}"`
    );
  }
}

// -----------------------------------------------------------------------------
// Category 5: Email Formats
// -----------------------------------------------------------------------------
console.log('\n--- Category 5: Email Redaction ---');

const emailCases = [
  { name: 'Plus tag email', input: 'User email is buyer+test@example.com', leaked: 'buyer+test@example.com' },
  { name: 'Subdomain email', input: 'Contact alex@dept.university.edu', leaked: 'alex@dept.university.edu' },
  { name: 'Dotted username email', input: 'Buyer is john.doe.junior@gmail.com', leaked: 'john.doe.junior@gmail.com' }
];

for (const ec of emailCases) {
  const res = sanitizeText(ec.input);
  expectMatch(
    ec.name,
    res.sanitizedText,
    !res.sanitizedText.includes(ec.leaked) && res.sanitizedText.includes('[EMAIL_REDACTED]'),
    `Must redact email without leaking "${ec.leaked}"`
  );
}

// -----------------------------------------------------------------------------
// Category 6: IP Addresses (IPv4 and IPv6)
// -----------------------------------------------------------------------------
console.log('\n--- Category 6: IP Address Redaction ---');

const ipCases = [
  { name: 'Standard IPv4', input: 'Logged from IP 192.168.1.100 at login', leaked: '192.168.1.100' },
  { name: 'Full IPv6', input: 'Logged from 2001:0db8:85a3:0000:0000:8a2e:0370:7334', leaked: '2001:0db8:85a3:0000:0000:8a2e:0370:7334' },
  { name: 'Compressed IPv6 ::1', input: 'Logged from ::1 localhost', leaked: '::1' }
];

for (const ipc of ipCases) {
  const res = sanitizeText(ipc.input);
  expectMatch(
    ipc.name,
    res.sanitizedText,
    !res.sanitizedText.includes(ipc.leaked) && res.sanitizedText.includes('[IP_REDACTED]'),
    `Must redact IP without leaking "${ipc.leaked}"`
  );
}

// -----------------------------------------------------------------------------
// Category 7: Known Buyer Name Redaction
// -----------------------------------------------------------------------------
console.log('\n--- Category 7: Buyer Name Masking ---');

const nameCases = [
  { name: 'Exact Name Match', input: 'Buyer Bruce Wayne filed dispute', names: ['Bruce Wayne'], leaked: 'Bruce Wayne' },
  { name: 'Case-Insensitive Match', input: 'Buyer bruce wayne filed dispute', names: ['Bruce Wayne'], leaked: 'bruce wayne' },
  { name: 'Special Regex Characters in Name', input: 'Buyer Alice (Ally) Smith filed dispute', names: ['Alice (Ally) Smith'], leaked: 'Alice (Ally) Smith' }
];

for (const nc of nameCases) {
  const res = sanitizeText(nc.input, nc.names);
  expectMatch(
    nc.name,
    res.sanitizedText,
    !res.sanitizedText.includes(nc.leaked) && res.sanitizedText.includes('[BUYER_NAME_REDACTED]'),
    `Must redact name without leaking "${nc.leaked}"`
  );
}

// -----------------------------------------------------------------------------
// Category 8: Full Context Bundle Sanitization & Preservation
// -----------------------------------------------------------------------------
console.log('\n--- Category 8: Full Context Bundle Sanitization & Preservation ---');

const bundle: DisputeContextBundle = {
  dispute: {
    dispute_id: 'PP-D-ADVERSARIAL-99',
    create_time: '2026-10-25T10:00:00Z',
    update_time: '2026-10-25T10:00:00Z',
    dispute_amount: { currency_code: 'USD', value: '499.99' },
    status: 'WAITING_FOR_SELLER_RESPONSE',
    reason: 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED',
    dispute_life_cycle_stage: 'CHARGEBACK',
    seller_response_due_date: '2026-10-28T23:59:59Z',
    allowed_response_options: ['PROVIDE_EVIDENCE', 'ACCEPT_CLAIM'],
    disputed_transactions: [
      {
        seller_transaction_id: 'TX-ADV-789',
        gross_amount: { currency_code: 'USD', value: '499.99' },
        buyer: {
          name: 'Clark Kent',
          email: 'clark.kent@dailyplanet.com',
          phone: { national_number: '555-987-6543' }
        },
        items: [
          {
            item_name: 'High-End Smart Watch',
            quantity: '1',
            item_cost: { currency_code: 'USD', value: '499.99' }
          }
        ]
      }
    ],
    messages: [
      {
        posted_by: 'BUYER',
        time_posted: '2026-10-25T11:00:00Z',
        content: 'I paid $499.99 for order TX-ADV-789. Send replacement to 344 Clinton St, Apt 3B, Metropolis. Contact clark.kent@dailyplanet.com or (555) 987-6543. Tracking 9400111899562534567890 never arrived.'
      }
    ]
  },
  shipmentTracking: [
    {
      transaction_id: 'TX-ADV-789',
      tracking_number: '9400111899562534567890',
      carrier: 'USPS',
      status: 'DELIVERED',
      actual_delivery_date: '2026-10-24T15:30:00Z'
    }
  ],
  buyerMessages: [],
  rawDisputeJson: '{}'
};

const sanitizedBundle = sanitizeDisputeContext(bundle);

expectMatch(
  'Bundle Dispute ID Preservation',
  sanitizedBundle.disputeId,
  sanitizedBundle.disputeId === 'PP-D-ADVERSARIAL-99',
  'Preserve dispute ID PP-D-ADVERSARIAL-99'
);

expectMatch(
  'Bundle Financial Amount Preservation',
  sanitizedBundle.amount,
  sanitizedBundle.amount === '499.99',
  'Preserve dispute amount 499.99'
);

expectMatch(
  'Bundle Shipment Tracking Preservation',
  JSON.stringify(sanitizedBundle.sanitizedShipmentInfo),
  sanitizedBundle.sanitizedShipmentInfo[0]?.trackingNumber === '9400111899562534567890' &&
  sanitizedBundle.sanitizedShipmentInfo[0]?.carrier === 'USPS' &&
  sanitizedBundle.sanitizedShipmentInfo[0]?.status === 'DELIVERED',
  'Preserve exact tracking number, carrier, and status in shipment info'
);

const msgContent = sanitizedBundle.sanitizedMessages[0]?.content || '';
expectMatch(
  'Bundle Message: PII Masked (Email)',
  msgContent,
  !msgContent.includes('clark.kent@dailyplanet.com'),
  'Email masked in message'
);

expectMatch(
  'Bundle Message: PII Masked (Phone)',
  msgContent,
  !msgContent.includes('555') && !msgContent.includes('987-6543'),
  'Phone masked in message'
);

expectMatch(
  'Bundle Message: PII Masked (Address)',
  msgContent,
  !msgContent.includes('344 Clinton St'),
  'Address masked in message'
);

expectMatch(
  'Bundle Message: Apartment/Suite Not Leaked',
  msgContent,
  !msgContent.includes('Apt 3B'),
  'Apartment 3B must not leak after street redaction'
);

expectMatch(
  'Bundle Message: Tracking Number Preserved in Message',
  msgContent,
  msgContent.includes('9400111899562534567890'),
  'Tracking number 9400111899562534567890 must be preserved inside message'
);

expectMatch(
  'Bundle Message: Financial Figure Preserved in Message',
  msgContent,
  msgContent.includes('$499.99'),
  'Financial figure $499.99 must be preserved inside message'
);

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log('=== TEST SUMMARY ===');
console.log('================================================================');
const total = results.length;
const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;
console.log(`Total Tests Run: ${total}`);
console.log(`Passed:          ${passed}`);
console.log(`Failed:          ${failed}`);

if (failed > 0) {
  console.log('\nFailed Tests:');
  for (const f of results.filter(r => !r.passed)) {
    console.log(`  - [${f.name}]: ${f.error}`);
  }
}

process.exit(failed > 0 ? 1 : 0);

