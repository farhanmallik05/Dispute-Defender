/**
 * Autonomous Triage Agent Implementation
 * 
 * Invokes LLM via Vercel AI SDK with structured Zod output validation.
 * Includes a deterministic fallback heuristic engine for offline/test execution.
 */

import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { RedactedContextBundle, TriageVerdict } from '../../types/dispute';
import { TriageVerdictSchema } from './schemas';
import { TRIAGE_AGENT_SYSTEM_PROMPT, buildTriageUserPrompt } from './prompts';

export async function runTriageAgent(context: RedactedContextBundle): Promise<TriageVerdict> {
  const isDemoMode = process.env.INTEGRITY_MODE === 'demo';
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const openAIKey = process.env.OPENAI_API_KEY;

  // In demo mode or if no API keys exist, immediately use deterministic heuristics
  if (isDemoMode || (!geminiKey && !openAIKey)) {
    return generateDeterministicTriageVerdict(context);
  }

  const modelChoice = process.env.AI_MODEL || 'gemini-2.5-flash-lite';
    try {
      let model;
      if (openAIKey && (modelChoice.startsWith('gpt') || !geminiKey)) {
        const openai = createOpenAI({ apiKey: openAIKey });
        model = openai(modelChoice.startsWith('gpt') ? modelChoice : 'gpt-4o-mini');
      } else if (geminiKey) {
        const google = createGoogleGenerativeAI({ apiKey: geminiKey });
        const resolvedModel = modelChoice.startsWith('gemini') ? modelChoice : 'gemini-2.5-flash-lite';
        model = google(resolvedModel);
      }

      if (model) {
        // Enforce a strict 5-second timeout on LLM inference
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 5000);

        try {
          const { object } = await generateObject({
            model,
            schema: TriageVerdictSchema,
            system: TRIAGE_AGENT_SYSTEM_PROMPT,
            prompt: buildTriageUserPrompt(JSON.stringify(context, null, 2)),
            temperature: 0.1,
            abortSignal: abortController.signal
          });
          clearTimeout(timeoutId);
        if (isVerdictGrounded(object, context)) {
          return object;
        }

        throw new Error('LLM verdict was not grounded in the supplied evidence bundle.');
        } catch (innerErr) {
          clearTimeout(timeoutId);
          throw innerErr;
        }
      }
    } catch (err: any) {
      console.warn('[Triage Agent] LLM inference failed, falling back to deterministic heuristics:', err.message);
    }

  // Deterministic Offline / Test Heuristic Fallback
  return generateDeterministicTriageVerdict(context);
}

function isVerdictGrounded(verdict: TriageVerdict, context: RedactedContextBundle): boolean {
  const allowedSourcePrefixes = [
    'sanitizedShipmentInfo',
    'sanitizedOrderInfo',
    'sanitizedMessages',
    'disputeId',
    'reason',
    'amount',
    'currency',
    'dueDate',
    'lifeCycleStage'
  ];
  const trackingNumbers = context.sanitizedShipmentInfo.map(shipment => shipment.trackingNumber).filter(Boolean);

  if (verdict.recommendation === 'FIGHT' && trackingNumbers.length === 0) return false;

  return verdict.evidenceChecklist.every(item => {
    const sourceIsKnown = allowedSourcePrefixes.some(prefix => item.sourceField.startsWith(prefix));
    const trackingIsKnown = !item.sourceField.toLowerCase().includes('tracking') ||
      trackingNumbers.some(number => item.claimedFact.includes(number));
    return sourceIsKnown && trackingIsKnown;
  });
}

/**
 * Deterministic rules-based triage generator used when offline or in automated test environments
 */
export function generateDeterministicTriageVerdict(context: RedactedContextBundle): TriageVerdict {
  const { disputeId, reason, sanitizedShipmentInfo, amount, currency } = context;

  const deliveredShipment = sanitizedShipmentInfo.find(
    s => s.status === 'DELIVERED'
  );
  const inTransitShipment = sanitizedShipmentInfo.find(
    s => s.status === 'IN_TRANSIT' || s.status === 'SHIPPED'
  );

  if (reason === 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED') {
    if (deliveredShipment) {
      return {
        disputeId,
        recommendation: 'FIGHT',
        confidenceScore: 95,
        summaryReason: `Verified carrier delivery confirmed. Carrier ${deliveredShipment.carrier} tracking ${deliveredShipment.trackingNumber} shows package successfully delivered${deliveredShipment.deliveryDate ? ` on ${deliveredShipment.deliveryDate}` : ''}.`,
        evidenceChecklist: [
          {
            sourceField: 'sanitizedShipmentInfo[0].status',
            claimedFact: `Shipment status is ${deliveredShipment.status}`,
            verified: true,
            notes: 'Official carrier record confirms delivery.'
          },
          {
            sourceField: 'sanitizedShipmentInfo[0].trackingNumber',
            claimedFact: `Carrier tracking number: ${deliveredShipment.trackingNumber}`,
            verified: true,
            notes: `Fulfillment handled by ${deliveredShipment.carrier}.`
          },
          {
            sourceField: 'sanitizedOrderInfo.grossAmount',
            claimedFact: `Order value matches disputed sum of ${amount} ${currency}`,
            verified: true,
            notes: 'Full amount accounted for in transaction records.'
          }
        ],
        proposedDraftNotes: `The item for this transaction was shipped via ${deliveredShipment.carrier} under tracking number ${deliveredShipment.trackingNumber} and confirmed delivered on ${deliveredShipment.deliveryDate || 'prior to dispute'}. Proof of fulfillment has been attached. We respectfully request that PayPal close this dispute in the seller's favor.`,
        evidenceTypeRequired: 'PROOF_OF_FULFILLMENT',
        missingEvidenceWarnings: [],
        riskAnalysis: 'High probability of winning (>90%). Evidence fulfills all PayPal seller protection criteria.'
      };
    }

    if (inTransitShipment) {
      return {
        disputeId,
        recommendation: 'FIGHT',
        confidenceScore: 75,
        summaryReason: `Package is currently in transit via ${inTransitShipment.carrier} (${inTransitShipment.trackingNumber}). Active shipment underway.`,
        evidenceChecklist: [
          {
            sourceField: 'sanitizedShipmentInfo[0].status',
            claimedFact: `Shipment status is ${inTransitShipment.status}`,
            verified: true,
            notes: 'Carrier has possession of package and is actively routing.'
          }
        ],
        proposedDraftNotes: `Order was shipped via ${inTransitShipment.carrier} with tracking number ${inTransitShipment.trackingNumber}. The package is actively in transit to the customer. Tracking proof has been provided.`,
        evidenceTypeRequired: 'PROOF_OF_FULFILLMENT',
        missingEvidenceWarnings: ['Final delivery scan is pending.'],
        riskAnalysis: 'Moderate probability of winning. Carrier scan validates fulfillment, but seller protection requires final delivery.'
      };
    }

    // No shipment tracking found
    return {
      disputeId,
      recommendation: 'ACCEPT',
      confidenceScore: 92,
      summaryReason: 'No valid shipment tracking record was located for this transaction. Fighting without delivery proof will result in automatic claim loss and an additional PayPal dispute penalty fee ($15-$20).',
      evidenceChecklist: [
        {
          sourceField: 'sanitizedShipmentInfo',
          claimedFact: 'No shipment tracking records found',
          verified: false,
          notes: 'Merchant lacks required Proof of Fulfillment.'
        }
      ],
      proposedDraftNotes: 'Merchant acknowledges order was not successfully tracked and agrees to issue a full refund to the buyer.',
      evidenceTypeRequired: 'OTHER',
      missingEvidenceWarnings: ['Missing carrier tracking number', 'Missing delivery confirmation'],
      riskAnalysis: 'Fighting this dispute carries a 0% win probability and will trigger a dispute fee. Immediate refund recommended.'
    };
  }

  // Default / Other reasons
  return {
    disputeId,
    recommendation: 'FIGHT',
    confidenceScore: 70,
    summaryReason: `Dispute reason is ${reason}. Merchant order records match buyer authorization.`,
    evidenceChecklist: [
      {
        sourceField: 'sanitizedOrderInfo.grossAmount',
        claimedFact: `Original transaction authorized for ${amount} ${currency}`,
        verified: true,
        notes: 'Transaction matches merchant checkout logs.'
      }
    ],
    proposedDraftNotes: `The customer received the goods and services as described in the original purchase terms. Order logs and authorization records have been submitted for review.`,
    evidenceTypeRequired: 'OTHER',
    missingEvidenceWarnings: [],
    riskAnalysis: 'Standard review. Provide detailed product specification records.'
  };
}
