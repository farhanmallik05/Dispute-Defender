import assert from 'node:assert/strict';
import { GET } from '../app/api/health/route';

async function runHealthTests() {
  console.log('=== Running System Health Diagnostic Tests ===');

  const res = await GET();
  assert.equal(res.status, 200, 'Health endpoint should return HTTP 200');

  const data = await res.json();
  console.log('Health Response:', JSON.stringify(data, null, 2));

  assert.equal(data.status, 'healthy', 'System status should be healthy');
  assert.equal(data.service, 'dispute-defender', 'Service name should match');
  assert.ok(typeof data.uptimeSeconds === 'number', 'Uptime should be a number');
  assert.ok(typeof data.responseTimeMs === 'number', 'Response time should be recorded');

  // Verify DB check
  assert.ok(data.checks.database, 'Database check must exist');
  assert.equal(data.checks.database.status, 'healthy', 'Database must be healthy');
  assert.ok(typeof data.checks.database.disputeRecords === 'number', 'Dispute count must be reported');
  assert.ok(typeof data.checks.database.auditLogEntries === 'number', 'Audit log count must be reported');

  // Verify PayPal check
  assert.ok(data.checks.paypal, 'PayPal check must exist');
  assert.ok('configured' in data.checks.paypal, 'PayPal configured boolean must exist');
  assert.ok(data.checks.paypal.environment, 'PayPal environment must exist');

  // Verify AI Triage check
  assert.ok(data.checks.aiTriage, 'AI triage check must exist');
  assert.ok(data.checks.aiTriage.provider, 'AI provider must exist');
  assert.equal(data.checks.aiTriage.fallbackEngine, 'deterministic_heuristics_active', 'Fallback engine must be active');

  console.log('✓ All System Health Diagnostic Tests Passed (6/6)');
}

runHealthTests().catch((err) => {
  console.error('[FAIL] Health test failed:', err);
  process.exit(1);
});
