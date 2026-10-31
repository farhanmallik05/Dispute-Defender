/**
 * Carrier Tracking Intelligence Unit Test Suite
 */

import { detectCarrierAndTracking, normalizeCarrierName, validateTrackingNumber } from '../lib/paypal/carrier-detector';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`[FAIL] ${msg}`);
}

console.log('=== Running Carrier Tracking Intelligence Unit Tests ===');

// Test 1: Normalize Carrier Names
console.log('Test 1: Normalizing Carrier Names...');
assert(normalizeCarrierName('FedEx Ground') === 'FEDEX', 'FedEx normalization failed');
assert(normalizeCarrierName('USPS Priority Mail') === 'USPS', 'USPS normalization failed');
assert(normalizeCarrierName('United Parcel Service') === 'UPS', 'UPS normalization failed');
assert(normalizeCarrierName('DHL Express') === 'DHL', 'DHL normalization failed');
assert(normalizeCarrierName('Royal Mail') === 'OTHER', 'Other normalization failed');
console.log('✓ Test 1 Passed: Carrier Normalization');

// Test 2: Detect UPS 1Z Tracking
console.log('Test 2: Detecting UPS 1Z Tracking...');
const upsNote = 'Package was dispatched via UPS 1Z9999999999999999 on Monday morning.';
const upsResult = detectCarrierAndTracking(upsNote);
assert(upsResult !== null, 'UPS tracking was not detected');
assert(upsResult?.carrier === 'UPS', `Expected carrier UPS, got ${upsResult?.carrier}`);
assert(upsResult?.trackingNumber === '1Z9999999999999999', `Expected tracking 1Z9999999999999999, got ${upsResult?.trackingNumber}`);
console.log('✓ Test 2 Passed: UPS 1Z Pattern Detection');

// Test 3: Detect USPS 22-Digit Domestic Tracking
console.log('Test 3: Detecting USPS Domestic Tracking...');
const uspsNote = 'Item was shipped via USPS tracking #9400111899562534567890 to buyer address.';
const uspsResult = detectCarrierAndTracking(uspsNote);
assert(uspsResult !== null, 'USPS tracking was not detected');
assert(uspsResult?.carrier === 'USPS', `Expected carrier USPS, got ${uspsResult?.carrier}`);
assert(uspsResult?.trackingNumber === '9400111899562534567890', `Expected tracking 9400111899562534567890, got ${uspsResult?.trackingNumber}`);
console.log('✓ Test 3 Passed: USPS Domestic Pattern Detection');

// Test 4: Detect FedEx Standard Tracking
console.log('Test 4: Detecting FedEx Ground Tracking...');
const fedexNote = 'Delivered by FedEx tracking: 122533485 on Oct 23.';
const fedexResult = detectCarrierAndTracking(fedexNote);
assert(fedexResult !== null, 'FedEx tracking was not detected');
assert(fedexResult?.carrier === 'FEDEX', `Expected carrier FEDEX, got ${fedexResult?.carrier}`);
assert(fedexResult?.trackingNumber === '122533485', `Expected tracking 122533485, got ${fedexResult?.trackingNumber}`);
console.log('✓ Test 4 Passed: FedEx Standard Pattern Detection');

// Test 5: Detect DHL Express Tracking
console.log('Test 5: Detecting DHL Express Tracking...');
const dhlNote = 'International shipment with DHL: 9876543210 confirmed delivery.';
const dhlResult = detectCarrierAndTracking(dhlNote);
assert(dhlResult !== null, 'DHL tracking was not detected');
assert(dhlResult?.carrier === 'DHL', `Expected carrier DHL, got ${dhlResult?.carrier}`);
assert(dhlResult?.trackingNumber === '9876543210', `Expected tracking 9876543210, got ${dhlResult?.trackingNumber}`);
console.log('✓ Test 5 Passed: DHL Express Pattern Detection');

// Test 6: Validate Tracking Syntax
console.log('Test 6: Validating Tracking Number Syntaxes...');
assert(validateTrackingNumber('UPS', '1Z9999999999999999'), 'Valid UPS format rejected');
assert(!validateTrackingNumber('UPS', '123'), 'Invalid UPS format accepted');
assert(validateTrackingNumber('USPS', '9400111899562534567890'), 'Valid USPS format rejected');
assert(validateTrackingNumber('FEDEX', '122533485012'), 'Valid FedEx format rejected');
assert(validateTrackingNumber('DHL', '1234567890'), 'Valid DHL format rejected');
console.log('✓ Test 6 Passed: Carrier Syntax Validation');

console.log('=== All Carrier Tracking Intelligence Tests Passed Successfully (6/6) ===');
