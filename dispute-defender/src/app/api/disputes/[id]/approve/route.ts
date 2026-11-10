import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { disputes, disputeContexts, triageDecisions } from '@/lib/db/schema';
import { logAuditEvent } from '@/lib/db/audit';
import { submitDisputeEvidence, acceptPayPalDisputeClaim, getDisputeActionLinks } from '@/lib/paypal/disputes';
import { detectCarrierAndTracking, normalizeCarrierName } from '@/lib/paypal/carrier-detector';
import { eq, desc } from 'drizzle-orm';
import { getEnv } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const disputeId = params.id;
    const body = await request.json();
    const { action, merchantEditedNotes, carrierName, trackingNumber } = body; // action: 'FIGHT' | 'ACCEPT'

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
      .orderBy(desc(triageDecisions.createdAt))
      .get();

    if (!decision) {
      return NextResponse.json({ error: 'No triage decision exists for this dispute.' }, { status: 409 });
    }

    if (dispute.status !== 'AWAITING_APPROVAL' || decision.status !== 'PENDING_APPROVAL') {
      return NextResponse.json({ error: 'This dispute is no longer awaiting merchant approval.' }, { status: 409 });
    }

    const contextRecord = await db
      .select()
      .from(disputeContexts)
      .where(eq(disputeContexts.disputeId, disputeId))
      .get();

    // Dynamically extract carrier and tracking number from body, context, or merchant notes
    let dynamicTrackingNumber: string | undefined = trackingNumber;
    let dynamicCarrierName: string | undefined = carrierName;

    if (!dynamicTrackingNumber && contextRecord?.trackingData) {
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

    if (!dynamicTrackingNumber) {
      const notes = merchantEditedNotes || decision?.draftNotes || '';
      const detected = detectCarrierAndTracking(notes);
      if (detected) {
        dynamicTrackingNumber = detected.trackingNumber;
        dynamicCarrierName = dynamicCarrierName || detected.carrier;
      } else {
        const trackingMatch = notes.match(/\b(1Z[0-9A-Z]{16}|[0-9]{8,22}|[A-Z]{2}[0-9]{9}[A-Z]{2})\b/i);
        if (trackingMatch) {
          dynamicTrackingNumber = trackingMatch[0];
        }
        if (/fedex/i.test(notes)) dynamicCarrierName = dynamicCarrierName || 'FEDEX';
        else if (/ups/i.test(notes)) dynamicCarrierName = dynamicCarrierName || 'UPS';
        else if (/usps/i.test(notes)) dynamicCarrierName = dynamicCarrierName || 'USPS';
        else if (/dhl/i.test(notes)) dynamicCarrierName = dynamicCarrierName || 'DHL';
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
    if (!actionLinks || !rawDispute?.links || !Array.isArray(rawDispute.links) || rawDispute.links.length === 0) {
      return NextResponse.json(
        { error: 'PayPal action permissions are unavailable; refresh the dispute before approving.' },
        { status: 409 }
      );
    }

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

    if (action === 'FIGHT' && !dynamicTrackingNumber) {
      return NextResponse.json(
        { error: 'Cannot submit evidence without a verified carrier tracking number.' },
        { status: 422 }
      );
    }

    const notesToSubmit = merchantEditedNotes || decision?.draftNotes || 'Evidence provided by seller.';
    if (typeof notesToSubmit !== 'string' || notesToSubmit.length > 4000) {
      return NextResponse.json({ error: 'Merchant notes must be a string of 4000 characters or fewer.' }, { status: 400 });
    }
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
    const isLiveProduction = getEnv().PAYPAL_ENV === 'live';

    const formattedAttachments = Array.isArray(body.attachments)
      ? body.attachments.map((a: any) => ({
          filename: a.filename || 'evidence.pdf',
          contentType: a.contentType || 'application/pdf',
          data: Buffer.from(a.dataBase64, 'base64'),
        }))
      : undefined;

    if (isLiveProduction && !hasCredentials) {
      await logAuditEvent({
        disputeId,
        eventType: 'SUBMISSION_FAILED',
        actor: 'SYSTEM',
        payload: { action, reason: 'PayPal credentials are not configured in live mode.' }
      });
      return NextResponse.json(
        { error: 'PayPal credentials are not configured for live submission.' },
        { status: 503 }
      );
    }

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
            notes: notesToSubmit,
            attachments: formattedAttachments,
            endpointUrl: actionLinks.provideEvidenceUrl
          });
        } catch (apiErr: any) {
          await logAuditEvent({
            disputeId,
            eventType: 'SUBMISSION_FAILED',
            actor: 'SYSTEM',
            payload: { action, error: apiErr.message }
          });
          return NextResponse.json({ error: 'PayPal evidence submission failed.' }, { status: 502 });
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
            acceptClaimType: 'REFUND',
            endpointUrl: actionLinks.acceptClaimUrl
          });
        } catch (apiErr: any) {
          await logAuditEvent({
            disputeId,
            eventType: 'SUBMISSION_FAILED',
            actor: 'SYSTEM',
            payload: { action, error: apiErr.message }
          });
          return NextResponse.json({ error: 'PayPal claim acceptance failed.' }, { status: 502 });
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
