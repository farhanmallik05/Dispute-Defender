import assert from 'node:assert/strict';
import { GET as getDisputes } from '../app/api/disputes/route';
import { GET as getAuditLogs } from '../app/api/audit/route';
import { GET as getHealth } from '../app/api/health/route';
import { POST as approveAction } from '../app/api/disputes/[id]/approve/route';

async function runResilienceTests() {
  console.log('=== Running UI Resilience & Error State Tests ===');

  // Test 1: Health endpoint returns healthy and diagnostics
  const healthRes = await getHealth();
  assert.equal(healthRes.status, 200, 'Health endpoint must respond HTTP 200');
  const healthData = await healthRes.json();
  assert.equal(healthData.status, 'healthy');
  console.log('✓ Test 1 Passed: System Health diagnostics responsive');

  // Test 2: Dispute Queue API resilience
  const queueRes = await getDisputes();
  assert.equal(queueRes.status, 200, 'Queue API must return HTTP 200');
  const queueData = await queueRes.json();
  assert.ok(Array.isArray(queueData.disputes), 'Queue must return disputes array');
  console.log(`✓ Test 2 Passed: Queue API returns valid array (${queueData.disputes.length} records)`);

  // Test 3: Audit Stream API resilience
  const auditRes = await getAuditLogs();
  assert.equal(auditRes.status, 200, 'Audit API must return HTTP 200');
  const auditData = await auditRes.json();
  assert.ok(Array.isArray(auditData.auditLogs), 'Audit stream must return array');
  console.log(`✓ Test 3 Passed: Audit API returns valid array (${auditData.auditLogs.length} events)`);

  // Test 4: Approval Error State — Non-existent dispute returns HTTP 404
  const notFoundReq = new Request('http://localhost:8000/api/disputes/PP-D-NONEXISTENT/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'FIGHT' })
  });
  const notFoundRes = await approveAction(notFoundReq, { params: { id: 'PP-D-NONEXISTENT' } });
  assert.equal(notFoundRes.status, 404, 'Non-existent dispute must return HTTP 404');
  console.log('✓ Test 4 Passed: 404 Error State handled gracefully');

  // Test 5: Approval Error State — Malformed action input returns HTTP 400
  const badReq = new Request('http://localhost:8000/api/disputes/PP-D-27801/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'INVALID_ACTION_XYZ' })
  });
  const badRes = await approveAction(badReq, { params: { id: 'PP-D-27801' } });
  assert.equal(badRes.status, 400, 'Invalid action input must return HTTP 400');
  console.log('✓ Test 5 Passed: 400 Bad Request error state handled gracefully');

  console.log('=== All 5 UI Resilience & Error State Tests Passed Successfully ===');
}

runResilienceTests().catch((err) => {
  console.error('[FAIL] Resilience tests failed:', err);
  process.exit(1);
});
