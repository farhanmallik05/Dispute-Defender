import { NextResponse } from 'next/server';
import { listPayPalDisputes } from '@/lib/paypal/disputes';
import { processDisputePipeline } from '@/lib/workflows/dispute-pipeline';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    let syncedCount = 0;
    const hasCredentials = Boolean(
      process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET
    );

    if (hasCredentials) {
      try {
        const result = await listPayPalDisputes({ pageSize: 10 });
        if (result.items && result.items.length > 0) {
          for (const item of result.items) {
            await processDisputePipeline(item);
            syncedCount++;
          }
          return NextResponse.json({
            success: true,
            source: 'paypal_sandbox',
            count: syncedCount
          });
        }
      } catch (paypalError: any) {
        console.warn('[Sync] PayPal Sandbox API call failed, falling back to local seeder:', paypalError.message);
      }
    }

    // Default seed fallback for instant demo testing
    const seedDispute = {
      dispute_id: `PP-D-${Math.floor(10000 + Math.random() * 90000)}`,
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString(),
      dispute_amount: { currency_code: 'USD', value: '189.00' },
      status: 'WAITING_FOR_SELLER_RESPONSE' as const,
      reason: 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED' as const,
      dispute_life_cycle_stage: 'CHARGEBACK' as const,
      seller_response_due_date: new Date(Date.now() + 86400000 * 5).toISOString(),
      allowed_response_options: ['PROVIDE_EVIDENCE', 'ACCEPT_CLAIM'],
      disputed_transactions: [
        {
          seller_transaction_id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
          gross_amount: { currency_code: 'USD', value: '189.00' },
          buyer: {
            name: 'Alex Shopper',
            email: 'alex.shopper@example.com'
          },
          items: [
            {
              item_name: 'Industrial Cybernetic Display 4K',
              quantity: '1',
              item_cost: { currency_code: 'USD', value: '189.00' }
            }
          ]
        }
      ],
      messages: [
        {
          posted_by: 'BUYER' as const,
          time_posted: new Date().toISOString(),
          content: 'I paid for the display to 742 Evergreen Terrace, but it never arrived!'
        }
      ],
      links: [
        {
          href: 'https://api-m.sandbox.paypal.com/v1/customer/disputes/test/provide-evidence',
          rel: 'provide-evidence',
          method: 'POST'
        },
        {
          href: 'https://api-m.sandbox.paypal.com/v1/customer/disputes/test/accept-claim',
          rel: 'accept-claim',
          method: 'POST'
        }
      ]
    };

    const res = await processDisputePipeline(seedDispute);
    return NextResponse.json({
      success: true,
      source: 'seed_pipeline',
      disputeId: res.disputeId,
      recommendation: res.recommendation
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
