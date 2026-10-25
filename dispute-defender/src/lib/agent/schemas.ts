/**
 * Zod Schemas for Dispute Defender Triage Agent
 */

import { z } from 'zod';

export const EvidenceChecklistItemSchema = z.object({
  sourceField: z
    .string()
    .describe('Exact source attribute, e.g. shipment.tracking_status or order.grossAmount'),
  claimedFact: z
    .string()
    .describe('The verified factual statement based solely on provided records'),
  verified: z
    .boolean()
    .describe('Whether this fact is definitively confirmed by official records'),
  notes: z
    .string()
    .describe('Contextual justification explaining relevance to the dispute defense')
});

export const TriageVerdictSchema = z.object({
  disputeId: z.string(),
  recommendation: z
    .enum(['FIGHT', 'ACCEPT'])
    .describe('FIGHT to submit evidence to defend the dispute, ACCEPT to refund the buyer'),
  confidenceScore: z
    .number()
    .min(0)
    .max(100)
    .describe('Confidence score between 0 and 100 based on evidentiary strength'),
  summaryReason: z
    .string()
    .describe('Concise executive summary of why the merchant should fight or accept'),
  evidenceChecklist: z
    .array(EvidenceChecklistItemSchema)
    .describe('Itemized list of concrete evidentiary facts verifying fulfillment or failure'),
  proposedDraftNotes: z
    .string()
    .describe('Professional draft rebuttal note formatted for PayPal dispute adjudicators'),
  evidenceTypeRequired: z
    .enum(['PROOF_OF_FULFILLMENT', 'PROOF_OF_REFUND', 'OTHER'])
    .describe('PayPal evidence type matching dispute requirements'),
  missingEvidenceWarnings: z
    .array(z.string())
    .describe('List of missing pieces of evidence that weaken the merchant case'),
  riskAnalysis: z
    .string()
    .describe('Analysis of dispute fee risk ($15-$20) vs win probability')
});

export type TriageVerdict = z.infer<typeof TriageVerdictSchema>;
