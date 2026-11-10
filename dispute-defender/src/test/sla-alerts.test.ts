import { checkExpiringDisputes } from '../lib/notifications/sla-alerts';
import { db } from '../lib/db';
import { disputes } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function runTests() {
  console.log('=== Running SLA Urgency & Alert Monitor Tests ===');

  const now = Date.now();
  const testDisputeCritical = 'TEST-SLA-CRITICAL';
  const testDisputeUrgent = 'TEST-SLA-URGENT';
  const testDisputeNormal = 'TEST-SLA-NORMAL';

  // Clean up any previous test state
  try {
    await db.delete(disputes).where(eq(disputes.id, testDisputeCritical));
    await db.delete(disputes).where(eq(disputes.id, testDisputeUrgent));
    await db.delete(disputes).where(eq(disputes.id, testDisputeNormal));
  } catch {}

  // Insert test records matching schema
  await db.insert(disputes).values({
    id: testDisputeCritical,
    status: 'AWAITING_APPROVAL',
    amount: 150.00,
    currency: 'USD',
    reason: 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED',
    lifeCycleStage: 'CHARGEBACK',
    dueDate: new Date(now + 12 * 60 * 60 * 1000).toISOString(), // 12 hours left
    rawJson: JSON.stringify({ id: testDisputeCritical }),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await db.insert(disputes).values({
    id: testDisputeUrgent,
    status: 'AWAITING_APPROVAL',
    amount: 240.00,
    currency: 'USD',
    reason: 'NOT_AS_DESCRIBED',
    lifeCycleStage: 'INQUIRY',
    dueDate: new Date(now + 36 * 60 * 60 * 1000).toISOString(), // 36 hours left
    rawJson: JSON.stringify({ id: testDisputeUrgent }),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await db.insert(disputes).values({
    id: testDisputeNormal,
    status: 'AWAITING_APPROVAL',
    amount: 80.00,
    currency: 'USD',
    reason: 'UNAUTHORISED',
    lifeCycleStage: 'CHARGEBACK',
    dueDate: new Date(now + 72 * 60 * 60 * 1000).toISOString(), // 72 hours left
    rawJson: JSON.stringify({ id: testDisputeNormal }),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const result = await checkExpiringDisputes(now);

  const criticalAlert = result.alerts.find(a => a.disputeId === testDisputeCritical);
  const urgentAlert = result.alerts.find(a => a.disputeId === testDisputeUrgent);
  const normalAlert = result.alerts.find(a => a.disputeId === testDisputeNormal);

  if (!criticalAlert || criticalAlert.urgency !== 'CRITICAL') {
    throw new Error(`Critical alert expectation failed: ${JSON.stringify(criticalAlert)}`);
  }
  console.log('✓ Test 1 Passed: <24h dispute classified as CRITICAL');

  if (!urgentAlert || urgentAlert.urgency !== 'URGENT') {
    throw new Error(`Urgent alert expectation failed: ${JSON.stringify(urgentAlert)}`);
  }
  console.log('✓ Test 2 Passed: 24h-48h dispute classified as URGENT');

  if (normalAlert) {
    throw new Error(`Normal dispute (>48h) should not trigger alert, but found: ${JSON.stringify(normalAlert)}`);
  }
  console.log('✓ Test 3 Passed: >48h dispute correctly filtered out');

  // Cleanup
  await db.delete(disputes).where(eq(disputes.id, testDisputeCritical));
  await db.delete(disputes).where(eq(disputes.id, testDisputeUrgent));
  await db.delete(disputes).where(eq(disputes.id, testDisputeNormal));

  console.log('=== All SLA Alert Monitor Tests Passed Successfully (3/3) ===');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
