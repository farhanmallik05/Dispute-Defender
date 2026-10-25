import { sanitizeText } from './test_regex_fixes';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

console.log('Testing against redactor.test.ts test cases:');

// Test 1: Email
const sample1 = 'Contact customer at alex.buyer@example.com or support@merchant.store';
const res1 = sanitizeText(sample1);
assert(!res1.sanitizedText.includes('alex.buyer@example.com'), 'Email leaked');
assert(res1.sanitizedText.includes('[EMAIL_REDACTED]'), 'Missing token');
assert(res1.replacements.emails === 2, `Expected 2 emails, got ${res1.replacements.emails}`);
console.log('✓ Test 1 Passed');

// Test 2: Phone
const sample2 = 'Buyer telephone is (555) 234-5678 or +1-800-555-0199.';
const res2 = sanitizeText(sample2);
assert(!res2.sanitizedText.includes('(555) 234-5678'), 'Phone leaked');
assert(!res2.sanitizedText.includes('+1-800-555-0199'), 'Intl phone leaked');
assert(res2.replacements.phones === 2, `Expected 2 phones, got ${res2.replacements.phones}`);
console.log('✓ Test 2 Passed');

// Test 3: Address
const sample3 = 'Delivery address was 742 Evergreen Terrace, Springfield, OR. Backup: 100 Innovation Way, 55 Ocean Circle, and 88 Metro Highway Apt 4B.';
const res3 = sanitizeText(sample3);
assert(!res3.sanitizedText.includes('742 Evergreen Terrace'), 'Terrace leaked');
assert(!res3.sanitizedText.includes('100 Innovation Way'), 'Way leaked');
assert(!res3.sanitizedText.includes('55 Ocean Circle'), 'Circle leaked');
assert(!res3.sanitizedText.includes('88 Metro Highway Apt 4B'), 'Highway leaked');
assert(res3.replacements.addresses === 4, `Expected 4 addresses, got ${res3.replacements.addresses}`);
console.log('✓ Test 3 Passed');

// Test 4: Name
const sample4 = 'Buyer Sarah Connor filed a dispute stating she never ordered this.';
const res4 = sanitizeText(sample4, ['Sarah Connor']);
assert(!res4.sanitizedText.includes('Sarah Connor'), 'Name leaked');
assert(res4.replacements.names === 1, `Expected 1 name, got ${res4.replacements.names}`);
console.log('✓ Test 4 Passed');

console.log('ALL UNIT TEST CHECKS PASSED!');
