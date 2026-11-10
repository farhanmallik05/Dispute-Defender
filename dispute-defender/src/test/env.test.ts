import { getEnv, EnvSchema } from '../lib/env';

console.log('=== Running Environment Schema & Configuration Tests ===');

// Test 1: Default fallback values
const defaultEnv = getEnv();
if (defaultEnv.INTEGRITY_MODE !== 'demo' && defaultEnv.INTEGRITY_MODE !== 'live') {
  throw new Error(`Unexpected default INTEGRITY_MODE: ${defaultEnv.INTEGRITY_MODE}`);
}
if (defaultEnv.PAYPAL_ENV !== 'sandbox' && defaultEnv.PAYPAL_ENV !== 'live') {
  throw new Error(`Unexpected default PAYPAL_ENV: ${defaultEnv.PAYPAL_ENV}`);
}
console.log('✓ Test 1 Passed: Default values validated');

// Test 2: Dynamic PAYPAL_MODE to PAYPAL_ENV resolution
const originalMode = process.env.PAYPAL_MODE;
const originalEnv = process.env.PAYPAL_ENV;

try {
  delete process.env.PAYPAL_ENV;
  process.env.PAYPAL_MODE = 'live';
  const resolvedEnv = getEnv();
  if (resolvedEnv.PAYPAL_ENV !== 'live') {
    throw new Error(`Expected PAYPAL_MODE=live to resolve to PAYPAL_ENV=live, got ${resolvedEnv.PAYPAL_ENV}`);
  }
  console.log('✓ Test 2 Passed: PAYPAL_MODE=live backward-compatibility resolution');
} finally {
  if (originalMode !== undefined) process.env.PAYPAL_MODE = originalMode;
  else delete process.env.PAYPAL_MODE;
  if (originalEnv !== undefined) process.env.PAYPAL_ENV = originalEnv;
  else delete process.env.PAYPAL_ENV;
}

// Test 3: Schema validation error on invalid port or provider
try {
  EnvSchema.parse({ PORT: 'not-a-number' });
  throw new Error('Expected invalid port to throw validation error');
} catch (err: any) {
  if (!err.errors) throw err;
  console.log('✓ Test 3 Passed: Zod schema enforces strict type bounds');
}

console.log('=== All Environment Schema Tests Passed Successfully (3/3) ===');
