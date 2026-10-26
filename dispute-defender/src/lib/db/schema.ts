/**
 * SQLite Database Schema via Drizzle ORM
 */

import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';

export const disputes = sqliteTable('disputes', {
  id: text('id').primaryKey(), // PayPal Dispute ID (e.g. PP-D-12345)
  status: text('status').notNull(), // NEEDS_TRIAGE, AWAITING_APPROVAL, EVIDENCE_SUBMITTED, CLAIM_ACCEPTED, RESOLVED
  reason: text('reason').notNull(),
  amount: real('amount').notNull(),
  currency: text('currency').notNull(),
  dueDate: text('due_date'),
  lifeCycleStage: text('life_cycle_stage').notNull(),
  transactionId: text('transaction_id'),
  allowedOptions: text('allowed_options'), // JSON stringified array
  rawJson: text('raw_json').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const disputeContexts = sqliteTable('dispute_contexts', {
  id: text('id').primaryKey(),
  disputeId: text('dispute_id')
    .notNull()
    .references(() => disputes.id),
  orderData: text('order_data'), // JSON string
  trackingData: text('tracking_data'), // JSON string
  buyerMessages: text('buyer_messages'), // JSON string
  redactedContext: text('redacted_context').notNull(), // JSON string
  createdAt: text('created_at').notNull()
});

export const triageDecisions = sqliteTable('triage_decisions', {
  id: text('id').primaryKey(),
  disputeId: text('dispute_id')
    .notNull()
    .references(() => disputes.id),
  recommendation: text('recommendation').notNull(), // FIGHT | ACCEPT
  confidenceScore: integer('confidence_score').notNull(),
  summaryReason: text('summary_reason').notNull(),
  evidenceChecklist: text('evidence_checklist').notNull(), // JSON string
  draftNotes: text('draft_notes').notNull(),
  merchantEditedNotes: text('merchant_edited_notes'),
  evidenceTypeRequired: text('evidence_type_required').notNull(),
  status: text('status').notNull(), // PENDING_APPROVAL, APPROVED, REJECTED
  approvedAt: text('approved_at'),
  createdAt: text('created_at').notNull()
});

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  disputeId: text('dispute_id').notNull(),
  eventType: text('event_type').notNull(), // WEBHOOK_RECEIVED, CONTEXT_AGGREGATED, PII_REDACTED, TRIAGE_COMPLETED, MERCHANT_APPROVED, PAYPAL_SUBMITTED
  actor: text('actor').notNull(), // SYSTEM, AGENT, MERCHANT
  eventId: text('event_id'), // PayPal webhook event ID, when applicable
  payload: text('payload').notNull(), // JSON snapshot
  timestamp: text('timestamp').notNull()
});

export const webhookEvents = sqliteTable('webhook_events', {
  id: text('id').primaryKey(),
  eventType: text('event_type').notNull(),
  receivedAt: text('received_at').notNull()
});
