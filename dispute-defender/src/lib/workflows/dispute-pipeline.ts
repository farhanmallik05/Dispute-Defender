/**
 * Dispute Defense Pipeline Orchestrator
 * 
 * Implements the multi-step lifecycle:
 * Step 1: Ingest & Upsert Dispute Header
 * Step 2: Aggregate Context (Orders, Transactions, Tracking)
 * Step 3: Zero-Trust PII Redaction
 * Step 4: AI Triage Agent Inference (Structured FIGHT vs ACCEPT)
 * Step 5: Persist Decision & Move to Awaiting Approval
 * Step 6: Log Immutable Audit Events
 */

import { db } from '../db';
import { disputes, disputeContexts, triageDecisions } from '../db/schema';
import { logAuditEvent } from '../db/audit';
import { sanitizeDisputeContext } from '../agent/redactor';
import { runTriageAgent } from '../agent/triage';
import { PayPalDispute, DisputeContextBundle } from '../../types/dispute';
import { eq } from 'drizzle-orm';

export async function processDisputePipeline(
  dispute: PayPalDispute,
  providedTracking: any[] = []
): Promise<{ disputeId: string; status: string; recommendation: string }> {
  const disputeId = dispute.dispute_id;
  const now = new Date().toISOString();

  // Step 1: Ingest Dispute Header
  await db
    .insert(disputes)
    .values({
      id: disputeId,
      status: 'NEEDS_TRIAGE',
      reason: dispute.reason,
      amount: parseFloat(dispute.dispute_amount.value),
      currency: dispute.dispute_amount.currency_code,
      dueDate: dispute.seller_response_due_date,
      lifeCycleStage: dispute.dispute_life_cycle_stage,
      transactionId: dispute.disputed_transactions?.[0]?.seller_transaction_id,
      allowedOptions: JSON.stringify(dispute.allowed_response_options || []),
      rawJson: JSON.stringify(dispute),
      createdAt: now,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: disputes.id,
      set: {
        status: 'NEEDS_TRIAGE',
        updatedAt: now
      }
    });

  await logAuditEvent({
    disputeId,
    eventType: 'SYNC_DISPUTE_FETCHED',
    actor: 'SYSTEM',
    payload: {
      reason: dispute.reason,
      amount: dispute.dispute_amount,
      stage: dispute.dispute_life_cycle_stage
    }
  });

  // Step 2: Context Aggregation
  // Tracking must come from PayPal/carrier integration or an explicit test
  // fixture. Never manufacture delivery evidence for a real dispute.
  const shipmentTracking = providedTracking;

  const contextBundle: DisputeContextBundle = {
    dispute,
    shipmentTracking,
    buyerMessages: dispute.messages || [],
    rawDisputeJson: JSON.stringify(dispute)
  };

  await logAuditEvent({
    disputeId,
    eventType: 'CONTEXT_AGGREGATED',
    actor: 'SYSTEM',
    payload: {
      trackingFound: shipmentTracking.length > 0,
      trackingStatus: shipmentTracking[0]?.status,
      messageCount: contextBundle.buyerMessages.length
    }
  });

  // Step 3: Zero-Trust PII Redaction
  const redactedBundle = sanitizeDisputeContext(contextBundle);

  await db
    .insert(disputeContexts)
    .values({
      id: `ctx_${disputeId}`,
      disputeId,
      orderData: JSON.stringify(redactedBundle.sanitizedOrderInfo),
      trackingData: JSON.stringify(redactedBundle.sanitizedShipmentInfo),
      buyerMessages: JSON.stringify(redactedBundle.sanitizedMessages),
      redactedContext: JSON.stringify(redactedBundle),
      createdAt: now
    })
    .onConflictDoUpdate({
      target: disputeContexts.id,
      set: {
        orderData: JSON.stringify(redactedBundle.sanitizedOrderInfo),
        trackingData: JSON.stringify(redactedBundle.sanitizedShipmentInfo),
        buyerMessages: JSON.stringify(redactedBundle.sanitizedMessages),
        redactedContext: JSON.stringify(redactedBundle),
        createdAt: now
      }
    });

  await logAuditEvent({
    disputeId,
    eventType: 'PII_REDACTED',
    actor: 'SYSTEM',
    payload: {
      redactionSummary: redactedBundle.redactionAudit
    }
  });

  // Step 4: AI Triage Agent Inference
  const verdict = await runTriageAgent(redactedBundle);

  // Step 5: Persist Decision
  await db
    .insert(triageDecisions)
    .values({
      id: `dec_${disputeId}`,
      disputeId,
      recommendation: verdict.recommendation,
      confidenceScore: verdict.confidenceScore,
      summaryReason: verdict.summaryReason,
      evidenceChecklist: JSON.stringify(verdict.evidenceChecklist),
      draftNotes: verdict.proposedDraftNotes,
      evidenceTypeRequired: verdict.evidenceTypeRequired,
      status: 'PENDING_APPROVAL',
      createdAt: now
    })
    .onConflictDoUpdate({
      target: triageDecisions.id,
      set: {
        recommendation: verdict.recommendation,
        confidenceScore: verdict.confidenceScore,
        summaryReason: verdict.summaryReason,
        evidenceChecklist: JSON.stringify(verdict.evidenceChecklist),
        draftNotes: verdict.proposedDraftNotes,
        evidenceTypeRequired: verdict.evidenceTypeRequired,
        status: 'PENDING_APPROVAL',
        merchantEditedNotes: null,
        approvedAt: null,
        createdAt: now
      }
    });

  // Advance dispute status to AWAITING_APPROVAL
  await db
    .update(disputes)
    .set({
      status: 'AWAITING_APPROVAL',
      updatedAt: now
    })
    .where(eq(disputes.id, disputeId));

  await logAuditEvent({
    disputeId,
    eventType: 'TRIAGE_EVALUATED',
    actor: 'AGENT',
    payload: {
      recommendation: verdict.recommendation,
      confidenceScore: verdict.confidenceScore,
      summaryReason: verdict.summaryReason,
      evidenceItemCount: verdict.evidenceChecklist.length
    }
  });

  return {
    disputeId,
    status: 'AWAITING_APPROVAL',
    recommendation: verdict.recommendation
  };
}
