/**
 * Test harness for prototyping the exact regex fixes
 */

// Email regex
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

// IP regex: IPv4 + full IPv6 + compressed IPv6 (including ::1)
const IP_REGEX = /\b(?:\d{1,3}\.){3}\d{1,3}\b|::1\b|(?:::)?(?:[0-9a-fA-F]{1,4}:){1,7}[0-9a-fA-F]{1,4}\b/g;

// Phone regex:
// Formatted with separators (US / Intl), or parenthesized, or strictly 10-digit / 11-digit (1+10) unformatted.
// Strictly guards against tracking numbers (9, 12, 15, 20, 22 digits) and ISO dates (YYYY-MM-DD).
const PHONE_REGEX = /(?<![A-Za-z0-9])(?:\+?\d{1,4}[-.\s])?(?:\(?\d{2,4}\)?[-.\s])\d{3,4}[-.\s]\d{4}(?![A-Za-z0-9])|(?<![A-Za-z0-9])\(\d{2,4}\)\s*\d{3,4}[-.\s]?\d{4}(?![A-Za-z0-9])|(?<!\d)(?:1\d{10}|\d{10})(?!\d)/g;

// Address regex:
const SUFFIXES = 'Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Crt|Way|Square|Sq|Trail|Trl|Parkway|Pkwy|Terrace|Ter|Circle|Cir|Place|Pl|Highway|Hwy|Loop|Crescent|Cres|Alley|Aly|Row|Run|Path|Walk|Plaza|Plz|Crossing|Xing|Close|Heights|Hts';
const UNIT_SPECIFIERS = 'Apt|Apartment|Suite|Ste|Unit|Room|Rm|#';

const ADDRESS_REGEX = new RegExp(
  `(?<![\\$.,\\d])\\b\\d{1,5}\\s+(?:(?!\\d{2,}\\b)[A-Za-z0-9#.-]+[\\s]+){1,4}\\b(?:${SUFFIXES})\\b(?:\\.?\\s*,?\\s*(?:${UNIT_SPECIFIERS})\\.?\\s*[A-Za-z0-9-]+)?`,
  'gi'
);

export function sanitizeText(text: string, knownBuyerNames: string[] = []) {
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
    // Extra guard against ISO dates: YYYY-MM-DD
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

// RUN ADVERSARIAL CASES
const trackingCases = [
  { name: 'USPS 22-digit Tracking', input: 'Shipped via USPS with tracking 9400111899562534567890 on Monday', tracking: '9400111899562534567890' },
  { name: 'USPS 20-digit Tracking', input: 'Package 92055000000000000000 has arrived', tracking: '92055000000000000000' },
  { name: 'FedEx 12-digit Tracking', input: 'Carrier FedEx tracking number is 122533485012', tracking: '122533485012' },
  { name: 'FedEx 15-digit Tracking', input: 'FedEx Express 961101900000000 in transit', tracking: '961101900000000' },
  { name: 'UPS 1Z Tracking', input: 'UPS tracking number 1Z9999999999999999 is delivered', tracking: '1Z9999999999999999' },
  { name: 'Short Tracking 122533485', input: 'Reference tracking 122533485 confirmed', tracking: '122533485' },
];

let failed = 0;

console.log('--- Checking Tracking Cases ---');
for (const tc of trackingCases) {
  const res = sanitizeText(tc.input);
  const ok = res.sanitizedText.includes(tc.tracking) && !res.sanitizedText.includes('[PHONE_REDACTED]');
  if (!ok) {
    console.error(`FAIL: ${tc.name} -> "${res.sanitizedText}"`);
    failed++;
  } else {
    console.log(`PASS: ${tc.name}`);
  }
}

console.log('\n--- Checking Financial Cases ---');
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
  const inc = fc.mustInclude.every(s => res.sanitizedText.includes(s));
  const exc = fc.mustNotInclude.every(s => !res.sanitizedText.includes(s));
  if (!inc || !exc) {
    console.error(`FAIL: ${fc.name} -> "${res.sanitizedText}"`);
    failed++;
  } else {
    console.log(`PASS: ${fc.name}`);
  }
}

console.log('\n--- Checking Address Cases ---');
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
  const ok = !res.sanitizedText.includes(ac.leaked) && res.sanitizedText.includes('[STREET_ADDRESS_REDACTED]');
  if (!ok) {
    console.error(`FAIL: ${ac.name} -> "${res.sanitizedText}"`);
    failed++;
  } else {
    console.log(`PASS: ${ac.name}`);
  }
}

console.log('\n--- Checking Phone Cases ---');
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
    const ok = res.sanitizedText.includes(pc.date) && !res.sanitizedText.includes('[PHONE_REDACTED]');
    if (!ok) {
      console.error(`FAIL: ${pc.name} -> "${res.sanitizedText}"`);
      failed++;
    } else {
      console.log(`PASS: ${pc.name}`);
    }
  } else {
    const ok = !res.sanitizedText.includes(pc.leaked!) && res.sanitizedText.includes(pc.redacted!);
    if (!ok) {
      console.error(`FAIL: ${pc.name} -> "${res.sanitizedText}"`);
      failed++;
    } else {
      console.log(`PASS: ${pc.name}`);
    }
  }
}

console.log('\n--- Checking IP Cases ---');
const ipCases = [
  { name: 'Standard IPv4', input: 'Logged from IP 192.168.1.100 at login', leaked: '192.168.1.100' },
  { name: 'Full IPv6', input: 'Logged from 2001:0db8:85a3:0000:0000:8a2e:0370:7334', leaked: '2001:0db8:85a3:0000:0000:8a2e:0370:7334' },
  { name: 'Compressed IPv6 ::1', input: 'Logged from ::1 localhost', leaked: '::1' }
];

for (const ipc of ipCases) {
  const res = sanitizeText(ipc.input);
  const ok = !res.sanitizedText.includes(ipc.leaked) && res.sanitizedText.includes('[IP_REDACTED]');
  if (!ok) {
    console.error(`FAIL: ${ipc.name} -> "${res.sanitizedText}"`);
    failed++;
  } else {
    console.log(`PASS: ${ipc.name}`);
  }
}

console.log('\n--- Checking Non-Address Words ---');
const wordCases = [
  { name: 'lowest cost', input: 'Order had 2 items at lowest cost' },
  { name: 'credit card', input: 'Customer paid with 1 credit card' },
  { name: 'product', input: 'Customer bought 1 product' },
  { name: 'dispute request', input: 'Customer filed 1 dispute request' },
  { name: 'water bottle', input: 'Received 1 water bottle' }
];

for (const wc of wordCases) {
  const res = sanitizeText(wc.input);
  if (res.sanitizedText.includes('[STREET_ADDRESS_REDACTED]')) {
    console.error(`FAIL: ${wc.name} was redacted as address! -> "${res.sanitizedText}"`);
    failed++;
  } else {
    console.log(`PASS: ${wc.name} not redacted as address`);
  }
}

// Category 8: Full Context Bundle Message Test
console.log('\n--- Checking Category 8 Bundle Message ---');
const bundleMsg = 'I paid $499.99 for order TX-ADV-789. Send replacement to 344 Clinton St, Apt 3B, Metropolis. Contact clark.kent@dailyplanet.com or (555) 987-6543. Tracking 9400111899562534567890 never arrived.';
const bundleRes = sanitizeText(bundleMsg, ['Clark Kent']);
console.log('Sanitized Bundle Message:');
console.log(bundleRes.sanitizedText);

const b1 = !bundleRes.sanitizedText.includes('clark.kent@dailyplanet.com') && bundleRes.sanitizedText.includes('[EMAIL_REDACTED]');
const b2 = !bundleRes.sanitizedText.includes('555') && !bundleRes.sanitizedText.includes('987-6543') && bundleRes.sanitizedText.includes('[PHONE_REDACTED]');
const b3 = !bundleRes.sanitizedText.includes('344 Clinton St') && bundleRes.sanitizedText.includes('[STREET_ADDRESS_REDACTED]');
const b4 = !bundleRes.sanitizedText.includes('Apt 3B');
const b5 = bundleRes.sanitizedText.includes('9400111899562534567890');
const b6 = bundleRes.sanitizedText.includes('$499.99');

if (!b1) { console.error('FAIL Category 8: Email'); failed++; } else { console.log('PASS Category 8: Email'); }
if (!b2) { console.error('FAIL Category 8: Phone'); failed++; } else { console.log('PASS Category 8: Phone'); }
if (!b3) { console.error('FAIL Category 8: Address'); failed++; } else { console.log('PASS Category 8: Address'); }
if (!b4) { console.error('FAIL Category 8: Apt 3B not leaked'); failed++; } else { console.log('PASS Category 8: Apt 3B not leaked'); }
if (!b5) { console.error('FAIL Category 8: Tracking preserved'); failed++; } else { console.log('PASS Category 8: Tracking preserved'); }
if (!b6) { console.error('FAIL Category 8: Financial amount preserved'); failed++; } else { console.log('PASS Category 8: Financial amount preserved'); }

console.log(`\n========================================`);
console.log(`TOTAL FAILED: ${failed}`);
console.log(`========================================`);
