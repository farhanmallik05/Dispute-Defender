import { NextResponse } from 'next/server';
import { verifyPayPalWebhookSignature } from '@/lib/paypal/webhook-verify';
import { processDisputePipeline } from '@/lib/workflows/dispute-pipeline';
import { logAuditEvent } from '@/lib/db/audit';
import { PayPalDispute } from '@/types/dispute';

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

    // If live webhook verification headers are present, verify them
    if (authAlgo && certUrl && transmissionId && transmissionSig) {
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

    // We listen to CUSTOMER.DISPUTE.CREATED, UPDATED, and RESOLVED
    if (eventType?.startsWith('CUSTOMER.DISPUTE.')) {
      const disputeResource = event.resource as PayPalDispute;
      const disputeId = disputeResource.dispute_id;

      await logAuditEvent({
        disputeId,
        eventType: 'WEBHOOK_RECEIVED',
        actor: 'SYSTEM',
        payload: {
          eventId: event.id,
          eventType: event.event_type,
          summary: event.summary
        }
      });

      // Run through our autonomous pipeline
      await processDisputePipeline(disputeResource);

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
