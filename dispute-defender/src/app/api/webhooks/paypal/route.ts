import { NextResponse } from 'next/server';
import { verifyPayPalWebhookSignature } from '@/lib/paypal/webhook-verify';
import { processDisputePipeline } from '@/lib/workflows/dispute-pipeline';
import { logAuditEvent } from '@/lib/db/audit';
import { PayPalDispute } from '@/types/dispute';
import { db } from '@/lib/db';
import { disputes, webhookEvents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const event = JSON.parse(rawBody);

    const headers = request.headers;
    const authAlgo = headers.get('paypal-auth-algo') || '';
    const certUrl = headers.get('paypal-cert-url') || '';
    const transmissionId = headers.get('paypal-transmission-id') || '';
    const transmissionSig = headers.get('paypal-transmission-sig') || '';
    const transmissionTime = headers.get('paypal-transmission-time') || '';

    const hasSignatureHeaders = Boolean(authAlgo && certUrl && transmissionId && transmissionSig && transmissionTime);
    const isLiveProduction = process.env.PAYPAL_MODE === 'live';

    // Unsigned webhooks are rejected in live production mode.
    if (!hasSignatureHeaders && isLiveProduction) {
      return NextResponse.json({ error: 'PayPal signature headers are required in live mode.' }, { status: 401 });
    }

    if (hasSignatureHeaders) {
      const isValid = await verifyPayPalWebhookSignature({
        authAlgo,
        certUrl,
        transmissionId,
        transmissionSig,
        transmissionTime,
        webhookEvent: event
      });

      if (!isValid) {
        console.warn('[Webhook] Signature verification failed for event:', event.id);
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }
    }

    const eventType = event.event_type;
    console.log(`[Webhook] Processing PayPal event: ${eventType} (${event.id})`);

    if (!event.id || !eventType) {
      return NextResponse.json({ error: 'Webhook event id and event_type are required.' }, { status: 400 });
    }

    // The primary key makes replay protection atomic across requests.
    const inserted = await db
      .insert(webhookEvents)
      .values({ id: event.id, eventType, receivedAt: new Date().toISOString() })
      .onConflictDoNothing()
      .returning({ id: webhookEvents.id });

    if (inserted.length === 0) {
      return NextResponse.json({ received: true, duplicate: true, eventId: event.id });
    }

    // We listen to CUSTOMER.DISPUTE.CREATED, UPDATED, and RESOLVED
    if (eventType?.startsWith('CUSTOMER.DISPUTE.')) {
      const disputeResource = event.resource as PayPalDispute;
      const disputeId = disputeResource.dispute_id;

      await logAuditEvent({
        disputeId,
        eventId: event.id,
        eventType: 'WEBHOOK_RECEIVED',
        actor: 'SYSTEM',
        payload: {
          eventId: event.id,
          eventType: event.event_type,
          summary: event.summary
        }
      });

      if (eventType === 'CUSTOMER.DISPUTE.RESOLVED') {
        await db
          .update(disputes)
          .set({
            status: 'RESOLVED',
            rawJson: JSON.stringify(disputeResource),
            updatedAt: new Date().toISOString()
          })
          .where(eq(disputes.id, disputeId));

        await logAuditEvent({
          disputeId,
          eventId: event.id,
          eventType: 'DISPUTE_RESOLVED',
          actor: 'SYSTEM',
          payload: { eventType, status: disputeResource.status }
        });
      } else {
        // Run through the pipeline. Missing carrier data remains missing; the
        // pipeline must not infer a delivery record.
        await processDisputePipeline(disputeResource);
      }

      return NextResponse.json({
        received: true,
        disputeId,
        eventType
      });
    }

    return NextResponse.json({ received: true, ignored: true });
  } catch (err: any) {
    console.error('[Webhook] Error processing PayPal webhook:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
