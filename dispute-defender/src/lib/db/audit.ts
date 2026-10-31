/**
 * Immutable Audit Logger
 */

import { db } from './index';
import { auditLogs } from './schema';
import crypto from 'crypto';

export type AuditActor = 'SYSTEM' | 'AGENT' | 'MERCHANT';

export type AuditEventType =
  | 'WEBHOOK_RECEIVED'
  | 'SYNC_DISPUTE_FETCHED'
  | 'CONTEXT_AGGREGATED'
  | 'PII_REDACTED'
  | 'TRIAGE_EVALUATED'
  | 'MERCHANT_EDITED_NOTES'
  | 'MERCHANT_APPROVED_FIGHT'
  | 'MERCHANT_APPROVED_ACCEPT'
  | 'PAYPAL_EVIDENCE_SUBMITTED'
  | 'PAYPAL_CLAIM_ACCEPTED'
  | 'SUBMISSION_FAILED'
  | 'SANDBOX_ADJUDICATED'
  | 'DISPUTE_UPDATED'
  | 'DISPUTE_RESOLVED';

export async function logAuditEvent(params: {
  disputeId: string;
  eventType: AuditEventType;
  actor: AuditActor;
  eventId?: string;
  payload: Record<string, any>;
}): Promise<void> {
  const auditEntry = {
    id: `aud_${crypto.randomUUID()}`,
    disputeId: params.disputeId,
    eventType: params.eventType,
    actor: params.actor,
    eventId: params.eventId || null,
    payload: JSON.stringify(params.payload),
    timestamp: new Date().toISOString()
  };

  try {
    await db.insert(auditLogs).values(auditEntry);
  } catch (err) {
    console.error('[Audit Logger] Failed to insert audit log entry:', err);
  }
}
