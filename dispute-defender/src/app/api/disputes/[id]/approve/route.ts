import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { disputes, disputeContexts, triageDecisions } from '@/lib/db/schema';
import { logAuditEvent } from '@/lib/db/audit';
import { submitDisputeEvidence, acceptPayPalDisputeClaim, getDisputeActionLinks } from '@/lib/paypal/disputes';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const disputeId = params.id;
    const body = await request.json();
    const { action, merchantEditedNotes } = body; // action: 'FIGHT' | 'ACCEPT'

    if (!action || (action !== 'FIGHT' && action !== 'ACCEPT')) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'FIGHT' or 'ACCEPT'." },
        { status: 400 }
      );
    }

    const dispute = await db
      .select()
      .from(disputes)
      .where(eq(disputes.id, disputeId))
      .get();

    if (!dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    const decision = await db
      .select()
      .from(triageDecisions)
      .where(eq(triageDecisions.disputeId, disputeId))
      .get();

    const contextRecord = await db
      .select()
      .from(disputeContexts)
      .where(eq(disputeContexts.disputeId, disputeId))
      .get();

    // Dynamically extract carrier and tracking number from disputeContexts
    let dynamicTrackingNumber: string | undefined;
    let dynamicCarrierName: string | undefined;

    if (contextRecord?.trackingData) {
      try {
        const parsed = JSON.parse(contextRecord.trackingData);
        const trackingList = Array.isArray(parsed) ? parsed : [parsed];
        if (trackingList.length > 0 && trackingList[0]) {
          const first = trackingList[0];
          dynamicTrackingNumber = first.trackingNumber || first.tracking_number;
          dynamicCarrierName = first.carrier || first.carrierName || first.carrier_name || first.carrier_name_other;
        }
      } catch (err) {
        console.warn('[Approval] Failed to parse trackingData:', err);
      }
    }

    if (!dynamicTrackingNumber && contextRecord?.redactedContext) {
      try {
        const parsedCtx = JSON.parse(contextRecord.redactedContext);
        const shipments = parsedCtx.sanitizedShipmentInfo;
        if (Array.isArray(shipments) && shipments.length > 0 && shipments[0]) {
          dynamicTrackingNumber = shipments[0].trackingNumber || shipments[0].tracking_number;
          dynamicCarrierName = shipments[0].carrier || shipments[0].carrierName || shipments[0].carrier_name;
        }
      } catch (err) {
        console.warn('[Approval] Failed to parse redactedContext:', err);
      }
    }

    // Validate HATEOAS permissions if dispute links are present in rawJson
    let rawDispute: any = null;
    try {
      if (dispute.rawJson) {
        rawDispute = JSON.parse(dispute.rawJson);
      }
    } catch {}

    const actionLinks = rawDispute ? getDisputeActionLinks(rawDispute) : null;
    if (actionLinks && rawDispute?.links && Array.isArray(rawDispute.links) && rawDispute.links.length > 0) {
      if (action === 'FIGHT' && !actionLinks.canProvideEvidence) {
        return NextResponse.json(
          { error: 'Dispute state does not permit providing evidence (HATEOAS link missing).' },
          { status: 400 }
        );
      }
      if (action === 'ACCEPT' && !actionLinks.canAcceptClaim) {
        return NextResponse.json(
          { error: 'Dispute state does not permit accepting claim (HATEOAS link missing).' },
          { status: 400 }
        );
      }
    }

    const notesToSubmit = merchantEditedNotes || decision?.draftNotes || 'Evidence provided by seller.';
    const now = new Date().toISOString();

    // Log the merchant approval event with the exact notes
    await logAuditEvent({
      disputeId,
      eventType: action === 'FIGHT' ? 'MERCHANT_APPROVED_FIGHT' : 'MERCHANT_APPROVED_ACCEPT',
      actor: 'MERCHANT',
      payload: {
        action,
        notesToSubmit,
        originalDraftNotes: decision?.draftNotes,
        carrierName: dynamicCarrierName,
        trackingNumber: dynamicTrackingNumber
      }
    });

    const hasCredentials = Boolean(
      process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET
    );

    let paypalApiResponse: any = {
      simulated: true,
      carrierName: dynamicCarrierName,
      trackingNumber: dynamicTrackingNumber
    };

    if (action === 'FIGHT') {
      if (hasCredentials) {
        try {
          paypalApiResponse = await submitDisputeEvidence({
            disputeId,
            evidenceType: (decision?.evidenceTypeRequired as any) || 'PROOF_OF_FULFILLMENT',
            trackingNumber: dynamicTrackingNumber,
            carrierName: dynamicCarrierName,
            notes: notesToSubmit
          });
        } catch (apiErr: any) {
          console.warn('[Approval] Live PayPal call failed; recording fallback:', apiErr.message);
          paypalApiResponse = { simulated: true, error: apiErr.message };
        }
      }

      // Update Database records
      await db
        .update(disputes)
        .set({
          status: 'EVIDENCE_SUBMITTED',
          updatedAt: now
        })
        .where(eq(disputes.id, disputeId));

      await db
        .update(triageDecisions)
        .set({
          status: 'APPROVED',
          merchantEditedNotes: notesToSubmit,
          approvedAt: now
        })
        .where(eq(triageDecisions.disputeId, disputeId));

      await logAuditEvent({
        disputeId,
        eventType: 'PAYPAL_EVIDENCE_SUBMITTED',
        actor: 'SYSTEM',
        payload: {
          evidenceType: decision?.evidenceTypeRequired || 'PROOF_OF_FULFILLMENT',
          carrierName: dynamicCarrierName,
          trackingNumber: dynamicTrackingNumber,
          notes: notesToSubmit,
          paypalResponse: paypalApiResponse
        }
      });

      return NextResponse.json({
        success: true,
        action: 'FIGHT',
        status: 'EVIDENCE_SUBMITTED',
        disputeId,
        carrierName: dynamicCarrierName,
        trackingNumber: dynamicTrackingNumber,
        paypalResponse: paypalApiResponse
      });
    } else {
      // ACCEPT path (Refund buyer)
      if (hasCredentials) {
        try {
          paypalApiResponse = await acceptPayPalDisputeClaim({
            disputeId,
            note: notesToSubmit,
            acceptClaimType: 'REFUND'
          });
        } catch (apiErr: any) {
          console.warn('[Approval] Live PayPal accept call failed; recording fallback:', apiErr.message);
          paypalApiResponse = { simulated: true, error: apiErr.message };
        }
      }

      await db
        .update(disputes)
        .set({
          status: 'CLAIM_ACCEPTED',
          updatedAt: now
        })
        .where(eq(disputes.id, disputeId));

      await db
        .update(triageDecisions)
        .set({
          status: 'APPROVED',
          merchantEditedNotes: notesToSubmit,
          approvedAt: now
        })
        .where(eq(triageDecisions.disputeId, disputeId));

      await logAuditEvent({
        disputeId,
        eventType: 'PAYPAL_CLAIM_ACCEPTED',
        actor: 'SYSTEM',
        payload: {
          note: notesToSubmit,
          paypalResponse: paypalApiResponse
        }
      });

      return NextResponse.json({
        success: true,
        action: 'ACCEPT',
        status: 'CLAIM_ACCEPTED',
        disputeId,
        paypalResponse: paypalApiResponse
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
