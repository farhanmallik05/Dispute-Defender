/**
 * Empirical Challenger Test Harness: Milestone M1.2
 * 
 * Verifies:
 * 1. Dynamic carrier and tracking number extraction per dispute seed in SQLite.
 * 2. Absolute absence of hardcoded tracking values.
 * 3. HATEOAS pre-flight rejection (HTTP 400) when required action link is missing.
 * 4. Dual HATEOAS relation styles (hyphenated vs underscored).
 * 5. Input validation, error codes, and audit trail integrity.
 */

import { POST as approveRoute } from '../app/api/disputes/[id]/approve/route';
import { db } from '../lib/db';
import { disputes, disputeContexts, triageDecisions, auditLogs } from '../lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getDisputeActionLinks, isActionAllowed } from '../lib/paypal/disputes';
import { PayPalDispute, PayPalHateoasLink } from '../types/dispute';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[CHALLENGER ASSERTION FAILED]: ${message}`);
  }
}

async function runEmpiricalChallenges() {
  console.log('======================================================================');
  console.log('  EMPIRICAL CHALLENGER TEST SUITE (M1.2)');
  console.log('  Target: Dynamic Carrier Sourcing & HATEOAS Pre-flight Validation');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    console.log(`-> Running Challenge: ${name}...`);
    try {
      await fn();
      console.log(`   ✓ PASSED: ${name}\n`);
      passed++;
    } catch (err: any) {
      console.error(`   ✗ FAILED: ${name}`);
      console.error(`     Error: ${err.message || String(err)}\n`);
      failed++;
    }
  }

  const now = new Date().toISOString();

  // Helper to insert or replace dispute & context
  async function setupDispute(
    disputeId: string,
    links: PayPalHateoasLink[],
    tracking: any[] = []
  ) {
    const rawDispute: PayPalDispute = {
      dispute_id: disputeId,
      create_time: now,
      update_time: now,
      dispute_amount: { currency_code: 'USD', value: '100.00' },
      status: 'AWAITING_APPROVAL' as any,
      reason: 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED',
      dispute_life_cycle_stage: 'CHARGEBACK',
      seller_response_due_date: '2026-11-10T12:00:00Z',
      allowed_response_options: ['PROVIDE_EVIDENCE', 'ACCEPT_CLAIM'],
      disputed_transactions: [
        {
          seller_transaction_id: `TXN-${disputeId}`,
          gross_amount: { currency_code: 'USD', value: '100.00' },
          buyer: { name: 'Test Buyer', email: 'test@example.com' },
          items: [{ item_name: 'Test Item', quantity: '1', item_cost: { currency_code: 'USD', value: '100.00' } }]
        }
      ],
      messages: [{ posted_by: 'BUYER', time_posted: now, content: 'Test message' }],
      links
    };

    // Upsert dispute
    await db
      .insert(disputes)
      .values({
        id: disputeId,
        status: 'AWAITING_APPROVAL',
        reason: 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED',
        amount: 100.0,
        currency: 'USD',
        dueDate: '2026-11-10T12:00:00Z',
        lifeCycleStage: 'CHARGEBACK',
        transactionId: `TXN-${disputeId}`,
        allowedOptions: JSON.stringify(['PROVIDE_EVIDENCE', 'ACCEPT_CLAIM']),
        rawJson: JSON.stringify(rawDispute),
        createdAt: now,
        updatedAt: now
      })
      .onConflictDoUpdate({
        target: disputes.id,
        set: {
          status: 'AWAITING_APPROVAL',
          rawJson: JSON.stringify(rawDispute),
          updatedAt: now
        }
      });

    // Delete existing context / decisions to prevent duplicates
    await db.delete(disputeContexts).where(eq(disputeContexts.disputeId, disputeId));
    await db.delete(triageDecisions).where(eq(triageDecisions.disputeId, disputeId));

    // Insert context
    await db.insert(disputeContexts).values({
      id: `ctx_${disputeId}_${Date.now()}`,
      disputeId,
      orderData: JSON.stringify({ orderId: `TXN-${disputeId}`, grossAmount: 100.0 }),
      trackingData: JSON.stringify(tracking),
      buyerMessages: JSON.stringify([{ sender: 'BUYER', content: 'Test message' }]),
      redactedContext: JSON.stringify({
        sanitizedShipmentInfo: tracking,
        sanitizedOrderInfo: { orderId: `TXN-${disputeId}`, grossAmount: 100.0 }
      }),
      createdAt: now
    });

    // Insert initial decision
    await db.insert(triageDecisions).values({
      id: `dec_${disputeId}_${Date.now()}`,
      disputeId,
      recommendation: tracking.length > 0 ? 'FIGHT' : 'ACCEPT',
      confidenceScore: 95,
      summaryReason: 'Empirical challenge decision',
      evidenceChecklist: JSON.stringify(['Tracking evidence verified']),
      draftNotes: 'Carrier confirmed delivery to buyer address.',
      evidenceTypeRequired: 'PROOF_OF_FULFILLMENT',
      status: 'PENDING_APPROVAL',
      createdAt: now
    });
  }

  // =========================================================================
  // SECTION 1: Dynamic Carrier & Tracking Sourcing Across Distinct Seeds
  // =========================================================================

  await test('1.1 Dynamic Carrier Sourcing: PP-D-27801 uses FedEx 122533485', async () => {
    await setupDispute('PP-D-27801', [
      { rel: 'provide-evidence', href: 'https://api-m.sandbox.paypal.com/v1/customer/disputes/PP-D-27801/provide-evidence', method: 'POST' },
      { rel: 'accept-claim', href: 'https://api-m.sandbox.paypal.com/v1/customer/disputes/PP-D-27801/accept-claim', method: 'POST' }
    ], [{ carrier: 'FEDEX', tracking_number: '122533485', status: 'DELIVERED' }]);

    const req = new Request('http://localhost/api/disputes/PP-D-27801/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'FIGHT' })
    });

    const res = await approveRoute(req, { params: { id: 'PP-D-27801' } });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const body = await res.json();
    assert(body.carrierName === 'FEDEX', `Expected carrier FEDEX, got ${body.carrierName}`);
    assert(body.trackingNumber === '122533485', `Expected tracking 122533485, got ${body.trackingNumber}`);
  });

  await test('1.2 Dynamic Carrier Sourcing: PP-D-27803 uses USPS 9400111899562534567890 (NEVER FedEx)', async () => {
    await setupDispute('PP-D-27803', [
      { rel: 'provide-evidence', href: 'https://api-m.sandbox.paypal.com/v1/customer/disputes/PP-D-27803/provide-evidence', method: 'POST' },
      { rel: 'accept-claim', href: 'https://api-m.sandbox.paypal.com/v1/customer/disputes/PP-D-27803/accept-claim', method: 'POST' }
    ], [{ carrier: 'USPS', tracking_number: '9400111899562534567890', status: 'DELIVERED' }]);

    const req = new Request('http://localhost/api/disputes/PP-D-27803/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'FIGHT' })
    });

    const res = await approveRoute(req, { params: { id: 'PP-D-27803' } });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const body = await res.json();
    assert(body.carrierName === 'USPS', `Expected carrier USPS, got ${body.carrierName}`);
    assert(body.trackingNumber === '9400111899562534567890', `Expected tracking 9400111899562534567890, got ${body.trackingNumber}`);
    assert(body.carrierName !== 'FEDEX', 'Carrier must not be hardcoded FEDEX');
    assert(body.trackingNumber !== '122533485', 'Tracking must not be hardcoded 122533485');
  });

  await test('1.3 Dynamic Carrier Sourcing: Arbitrary Third-Party Carrier UPS (1Z9999999999999999)', async () => {
    await setupDispute(
      'PP-D-CHALLENGE-UPS',
      [
        { rel: 'provide-evidence', href: 'https://api-m.sandbox.paypal.com/v1/customer/disputes/PP-D-CHALLENGE-UPS/provide-evidence', method: 'POST' },
        { rel: 'accept-claim', href: 'https://api-m.sandbox.paypal.com/v1/customer/disputes/PP-D-CHALLENGE-UPS/accept-claim', method: 'POST' }
      ],
      [{ carrier: 'UPS', tracking_number: '1Z9999999999999999', status: 'DELIVERED' }]
    );

    const req = new Request('http://localhost/api/disputes/PP-D-CHALLENGE-UPS/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'FIGHT' })
    });

    const res = await approveRoute(req, { params: { id: 'PP-D-CHALLENGE-UPS' } });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const body = await res.json();
    assert(body.carrierName === 'UPS', `Expected carrier UPS, got ${body.carrierName}`);
    assert(body.trackingNumber === '1Z9999999999999999', `Expected tracking 1Z9999999999999999, got ${body.trackingNumber}`);

    // Verify audit log has exact dynamic carrier
    const logs = await db.select().from(auditLogs).where(eq(auditLogs.disputeId, 'PP-D-CHALLENGE-UPS'));
    const evidenceLog = logs.find(l => l.eventType === 'PAYPAL_EVIDENCE_SUBMITTED');
    assert(Boolean(evidenceLog), 'Missing PAYPAL_EVIDENCE_SUBMITTED audit log');
    const payload = JSON.parse(evidenceLog!.payload);
    assert(payload.carrierName === 'UPS', `Audit log carrierName expected UPS, got ${payload.carrierName}`);
    assert(payload.trackingNumber === '1Z9999999999999999', `Audit log trackingNumber expected 1Z9999999999999999, got ${payload.trackingNumber}`);
  });

  await test('1.4 Dynamic Carrier Sourcing: Arbitrary Third-Party Carrier DHL Express (DHL-987654321)', async () => {
    await setupDispute(
      'PP-D-CHALLENGE-DHL',
      [
        { rel: 'provide-evidence', href: 'https://api-m.sandbox.paypal.com/v1/customer/disputes/PP-D-CHALLENGE-DHL/provide-evidence', method: 'POST' },
        { rel: 'accept-claim', href: 'https://api-m.sandbox.paypal.com/v1/customer/disputes/PP-D-CHALLENGE-DHL/accept-claim', method: 'POST' }
      ],
      [{ carrierName: 'DHL_EXPRESS', trackingNumber: 'DHL-987654321', status: 'DELIVERED' }]
    );

    const req = new Request('http://localhost/api/disputes/PP-D-CHALLENGE-DHL/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'FIGHT' })
    });

    const res = await approveRoute(req, { params: { id: 'PP-D-CHALLENGE-DHL' } });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const body = await res.json();
    assert(body.carrierName === 'DHL_EXPRESS', `Expected carrier DHL_EXPRESS, got ${body.carrierName}`);
    assert(body.trackingNumber === 'DHL-987654321', `Expected tracking DHL-987654321, got ${body.trackingNumber}`);
  });

  await test('1.5 Empty Tracking Seed (PP-D-27802): FIGHT is rejected without verified evidence', async () => {
    await setupDispute('PP-D-27802', [
      { rel: 'provide-evidence', href: 'https://api-m.sandbox.paypal.com/v1/customer/disputes/PP-D-27802/provide-evidence', method: 'POST' },
      { rel: 'accept-claim', href: 'https://api-m.sandbox.paypal.com/v1/customer/disputes/PP-D-27802/accept-claim', method: 'POST' }
    ], []);

    const req = new Request('http://localhost/api/disputes/PP-D-27802/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'FIGHT' })
    });

    const res = await approveRoute(req, { params: { id: 'PP-D-27802' } });
    assert(res.status === 422, `Expected 422, got ${res.status}`);
    const body = await res.json();
    assert(body.error.includes('verified carrier tracking'), `Expected fail-closed evidence error, got ${body.error}`);
  });

  await test('1.6 Empty Tracking Seed (PP-D-27802): ACCEPT sets CLAIM_ACCEPTED and records audit trail', async () => {
    await setupDispute('PP-D-27802', [
      { rel: 'provide-evidence', href: 'https://api-m.sandbox.paypal.com/v1/customer/disputes/PP-D-27802/provide-evidence', method: 'POST' },
      { rel: 'accept-claim', href: 'https://api-m.sandbox.paypal.com/v1/customer/disputes/PP-D-27802/accept-claim', method: 'POST' }
    ], []);

    const req = new Request('http://localhost/api/disputes/PP-D-27802/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ACCEPT', merchantEditedNotes: 'Buyer refund approved due to lost in transit.' })
    });

    const res = await approveRoute(req, { params: { id: 'PP-D-27802' } });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const body = await res.json();
    assert(body.action === 'ACCEPT', `Expected action ACCEPT, got ${body.action}`);
    assert(body.status === 'CLAIM_ACCEPTED', `Expected status CLAIM_ACCEPTED, got ${body.status}`);

    // Verify DB update
    const d = await db.select().from(disputes).where(eq(disputes.id, 'PP-D-27802')).get();
    assert(d?.status === 'CLAIM_ACCEPTED', `DB status must be CLAIM_ACCEPTED, got ${d?.status}`);
  });

  // =========================================================================
  // SECTION 2: HATEOAS Link Validation & Pre-flight Rejection
  // =========================================================================

  await test('2.1 HATEOAS Rejection: Dispute lacking provide-evidence link rejects FIGHT with HTTP 400', async () => {
    // Only accept-claim link is provided
    await setupDispute(
      'PP-D-CHALLENGE-NO-FIGHT-LINK',
      [
        { rel: 'accept-claim', href: 'https://api-m.sandbox.paypal.com/v1/customer/disputes/test/accept-claim', method: 'POST' }
      ],
      [{ carrier: 'FEDEX', tracking_number: '123456', status: 'DELIVERED' }]
    );

    const req = new Request('http://localhost/api/disputes/PP-D-CHALLENGE-NO-FIGHT-LINK/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'FIGHT' })
    });

    const res = await approveRoute(req, { params: { id: 'PP-D-CHALLENGE-NO-FIGHT-LINK' } });
    assert(res.status === 400, `Expected HTTP 400 for missing provide-evidence link, got ${res.status}`);
    const body = await res.json();
    assert(
      body.error.includes('HATEOAS link missing') || body.error.includes('does not permit providing evidence'),
      `Expected HATEOAS rejection error message, got: ${body.error}`
    );

    // Verify DB was NOT updated to EVIDENCE_SUBMITTED
    const d = await db.select().from(disputes).where(eq(disputes.id, 'PP-D-CHALLENGE-NO-FIGHT-LINK')).get();
    assert(d?.status === 'AWAITING_APPROVAL', `Status must remain AWAITING_APPROVAL, got ${d?.status}`);
  });

  await test('2.2 HATEOAS Rejection: Dispute lacking accept-claim link rejects ACCEPT with HTTP 400', async () => {
    // Only provide-evidence link is provided
    await setupDispute(
      'PP-D-CHALLENGE-NO-ACCEPT-LINK',
      [
        { rel: 'provide-evidence', href: 'https://api-m.sandbox.paypal.com/v1/customer/disputes/test/provide-evidence', method: 'POST' }
      ],
      []
    );

    const req = new Request('http://localhost/api/disputes/PP-D-CHALLENGE-NO-ACCEPT-LINK/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ACCEPT' })
    });

    const res = await approveRoute(req, { params: { id: 'PP-D-CHALLENGE-NO-ACCEPT-LINK' } });
    assert(res.status === 400, `Expected HTTP 400 for missing accept-claim link, got ${res.status}`);
    const body = await res.json();
    assert(
      body.error.includes('HATEOAS link missing') || body.error.includes('does not permit accepting claim'),
      `Expected HATEOAS rejection error message, got: ${body.error}`
    );

    // Verify DB was NOT updated to CLAIM_ACCEPTED
    const d = await db.select().from(disputes).where(eq(disputes.id, 'PP-D-CHALLENGE-NO-ACCEPT-LINK')).get();
    assert(d?.status === 'AWAITING_APPROVAL', `Status must remain AWAITING_APPROVAL, got ${d?.status}`);
  });

  await test('2.3 HATEOAS Rejection: Dispute with neither link (e.g. only "self") rejects both FIGHT & ACCEPT with HTTP 400', async () => {
    await setupDispute(
      'PP-D-CHALLENGE-NO-ACTIONS',
      [
        { rel: 'self', href: 'https://api-m.sandbox.paypal.com/v1/customer/disputes/test', method: 'GET' }
      ],
      []
    );

    // Test FIGHT
    const reqFight = new Request('http://localhost/api/disputes/PP-D-CHALLENGE-NO-ACTIONS/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'FIGHT' })
    });
    const resFight = await approveRoute(reqFight, { params: { id: 'PP-D-CHALLENGE-NO-ACTIONS' } });
    assert(resFight.status === 400, `Expected 400 for FIGHT, got ${resFight.status}`);

    // Test ACCEPT
    const reqAccept = new Request('http://localhost/api/disputes/PP-D-CHALLENGE-NO-ACTIONS/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ACCEPT' })
    });
    const resAccept = await approveRoute(reqAccept, { params: { id: 'PP-D-CHALLENGE-NO-ACTIONS' } });
    assert(resAccept.status === 400, `Expected 400 for ACCEPT, got ${resAccept.status}`);
  });

  await test('2.4 HATEOAS Style Equivalence: Underscored links (provide_evidence & accept_claim) successfully permit both actions', async () => {
    // Both links provided with underscores
    await setupDispute(
      'PP-D-CHALLENGE-UNDERSCORES',
      [
        { rel: 'provide_evidence', href: 'https://api-m.sandbox.paypal.com/v1/customer/disputes/test/provide-evidence', method: 'POST' },
        { rel: 'accept_claim', href: 'https://api-m.sandbox.paypal.com/v1/customer/disputes/test/accept-claim', method: 'POST' }
      ],
      [{ carrier: 'FEDEX', tracking_number: '122533485', status: 'DELIVERED' }]
    );

    // Test FIGHT with underscored link
    const reqFight = new Request('http://localhost/api/disputes/PP-D-CHALLENGE-UNDERSCORES/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'FIGHT' })
    });
    const resFight = await approveRoute(reqFight, { params: { id: 'PP-D-CHALLENGE-UNDERSCORES' } });
    assert(resFight.status === 200, `Expected 200 for FIGHT with provide_evidence, got ${resFight.status}`);
    const bodyFight = await resFight.json();
    assert(bodyFight.status === 'EVIDENCE_SUBMITTED', 'Status should be EVIDENCE_SUBMITTED');

    // Recreate the approval state for the second one-time action.
    await setupDispute(
      'PP-D-CHALLENGE-UNDERSCORES',
      [
        { rel: 'provide_evidence', href: 'https://api-m.sandbox.paypal.com/v1/customer/disputes/test/provide-evidence', method: 'POST' },
        { rel: 'accept_claim', href: 'https://api-m.sandbox.paypal.com/v1/customer/disputes/test/accept-claim', method: 'POST' }
      ],
      [{ carrier: 'FEDEX', tracking_number: '122533485', status: 'DELIVERED' }]
    );

    // Test ACCEPT with underscored link
    const reqAccept = new Request('http://localhost/api/disputes/PP-D-CHALLENGE-UNDERSCORES/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ACCEPT' })
    });
    const resAccept = await approveRoute(reqAccept, { params: { id: 'PP-D-CHALLENGE-UNDERSCORES' } });
    assert(resAccept.status === 200, `Expected 200 for ACCEPT with accept_claim, got ${resAccept.status}`);
    const bodyAccept = await resAccept.json();
    assert(bodyAccept.status === 'CLAIM_ACCEPTED', 'Status should be CLAIM_ACCEPTED');
  });

  await test('2.5 HATEOAS Helper Function Unit Verification (getDisputeActionLinks & isActionAllowed)', async () => {
    const mockHyphenatedDispute = {
      links: [
        { rel: 'provide-evidence', href: 'http://test/evidence', method: 'POST' },
        { rel: 'accept-claim', href: 'http://test/accept', method: 'POST' }
      ]
    } as any;

    const mockUnderscoredDispute = {
      links: [
        { rel: 'provide_evidence', href: 'http://test/evidence', method: 'POST' },
        { rel: 'accept_claim', href: 'http://test/accept', method: 'POST' }
      ]
    } as any;

    const linksHyphen = getDisputeActionLinks(mockHyphenatedDispute);
    assert(linksHyphen.canProvideEvidence === true, 'canProvideEvidence hyphenated failed');
    assert(linksHyphen.canAcceptClaim === true, 'canAcceptClaim hyphenated failed');

    const linksUnderscore = getDisputeActionLinks(mockUnderscoredDispute);
    assert(linksUnderscore.canProvideEvidence === true, 'canProvideEvidence underscored failed');
    assert(linksUnderscore.canAcceptClaim === true, 'canAcceptClaim underscored failed');

    assert(isActionAllowed(mockHyphenatedDispute, 'provide-evidence') === true, 'isActionAllowed hyphen/hyphen failed');
    assert(isActionAllowed(mockHyphenatedDispute, 'provide_evidence') === true, 'isActionAllowed hyphen/under failed');
    assert(isActionAllowed(mockUnderscoredDispute, 'provide-evidence') === true, 'isActionAllowed under/hyphen failed');
    assert(isActionAllowed(mockUnderscoredDispute, 'provide_evidence') === true, 'isActionAllowed under/under failed');
    assert(isActionAllowed(mockUnderscoredDispute, 'appeal') === false, 'isActionAllowed negative case failed');
  });

  // =========================================================================
  // SECTION 3: Robustness, Error Handling & Merchant Notes Override
  // =========================================================================

  await test('3.1 Error Handling: Non-existent dispute returns HTTP 404', async () => {
    const req = new Request('http://localhost/api/disputes/PP-D-DOES-NOT-EXIST-404/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'FIGHT' })
    });

    const res = await approveRoute(req, { params: { id: 'PP-D-DOES-NOT-EXIST-404' } });
    assert(res.status === 404, `Expected 404, got ${res.status}`);
    const body = await res.json();
    assert(body.error === 'Dispute not found', `Expected 'Dispute not found', got: ${body.error}`);
  });

  await test('3.2 Error Handling: Invalid action returns HTTP 400', async () => {
    const req = new Request('http://localhost/api/disputes/PP-D-27801/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ESCORT_CARRIER' })
    });

    const res = await approveRoute(req, { params: { id: 'PP-D-27801' } });
    assert(res.status === 400, `Expected 400 for invalid action, got ${res.status}`);
    const body = await res.json();
    assert(body.error.includes("Must be 'FIGHT' or 'ACCEPT'"), `Expected action validation error, got: ${body.error}`);
  });

  await test('3.3 Merchant Notes Override: merchantEditedNotes accurately persists to DB and audit trail', async () => {
    await setupDispute(
      'PP-D-CHALLENGE-NOTES-OVERRIDE',
      [
        { rel: 'provide-evidence', href: 'https://api-m.sandbox.paypal.com/v1/customer/disputes/test/provide-evidence', method: 'POST' }
      ],
      [{ carrier: 'UPS', tracking_number: '1Z9999999999', status: 'DELIVERED' }]
    );

    const customRebuttal = 'ADVERSARIAL_TEST_NOTE: Exact signature and GPS coordinates attached to proof packet.';

    const req = new Request('http://localhost/api/disputes/PP-D-CHALLENGE-NOTES-OVERRIDE/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'FIGHT',
        merchantEditedNotes: customRebuttal
      })
    });

    const res = await approveRoute(req, { params: { id: 'PP-D-CHALLENGE-NOTES-OVERRIDE' } });
    assert(res.status === 200, `Expected 200, got ${res.status}`);

    // Verify in triageDecisions table
    const dec = await db.select().from(triageDecisions).where(eq(triageDecisions.disputeId, 'PP-D-CHALLENGE-NOTES-OVERRIDE')).get();
    assert(dec?.merchantEditedNotes === customRebuttal, `triageDecisions.merchantEditedNotes mismatch: ${dec?.merchantEditedNotes}`);

    // Verify in auditLogs table
    const logs = await db.select().from(auditLogs).where(eq(auditLogs.disputeId, 'PP-D-CHALLENGE-NOTES-OVERRIDE'));
    const approveLog = logs.find(l => l.eventType === 'MERCHANT_APPROVED_FIGHT');
    assert(Boolean(approveLog), 'Missing MERCHANT_APPROVED_FIGHT audit log');
    const approvePayload = JSON.parse(approveLog!.payload);
    assert(approvePayload.notesToSubmit === customRebuttal, 'Audit log missing custom rebuttal');

    const submitLog = logs.find(l => l.eventType === 'PAYPAL_EVIDENCE_SUBMITTED');
    assert(Boolean(submitLog), 'Missing PAYPAL_EVIDENCE_SUBMITTED audit log');
    const submitPayload = JSON.parse(submitLog!.payload);
    assert(submitPayload.notes === customRebuttal, 'Audit log submit payload missing custom rebuttal');
  });

  // =========================================================================
  // SUMMARY REPORT
  // =========================================================================
  console.log('======================================================================');
  console.log('  EMPIRICAL CHALLENGER TEST RESULTS');
  console.log('======================================================================');
  console.log(`  Total Challenges: ${passed + failed}`);
  console.log(`  Passed          : ${passed}`);
  console.log(`  Failed          : ${failed}`);
  console.log(`  Success Rate    : ${(((passed) / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('======================================================================\n');

  if (failed > 0) {
    throw new Error(`${failed} challenge(s) failed!`);
  }
}

runEmpiricalChallenges()
  .then(() => {
    console.log('[CHALLENGER SUITE COMPLETE] All tests passed.');
    process.exit(0);
  })
  .catch(err => {
    console.error('[CHALLENGER SUITE ERROR]:', err);
    process.exit(1);
  });
