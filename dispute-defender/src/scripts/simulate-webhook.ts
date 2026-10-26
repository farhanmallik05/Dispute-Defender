/**
 * Local Webhook Simulator
 * Dispatches simulated signed PayPal dispute webhooks for testing.
 */

import { processDisputePipeline } from '../lib/workflows/dispute-pipeline';
import { closeDatabase } from '../lib/db';
import { PayPalDispute } from '../types/dispute';

const MOCK_WEBHOOK_EVENT = {
  id: 'WH-EVT-9988776655',
  event_version: '1.0',
  create_time: new Date().toISOString(),
  resource_type: 'dispute',
  event_type: 'CUSTOMER.DISPUTE.CREATED',
  summary: 'A customer opened a dispute on transaction TXN-100293',
  resource: {
    dispute_id: 'PP-D-39011',
    create_time: new Date().toISOString(),
    update_time: new Date().toISOString(),
    dispute_amount: { currency_code: 'USD', value: '249.99' },
    status: 'WAITING_FOR_SELLER_RESPONSE',
    reason: 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED',
    dispute_life_cycle_stage: 'CHARGEBACK',
    seller_response_due_date: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days left
    allowed_response_options: ['PROVIDE_EVIDENCE', 'ACCEPT_CLAIM'],
    disputed_transactions: [
      {
        seller_transaction_id: 'TXN-100293',
        gross_amount: { currency_code: 'USD', value: '249.99' },
        buyer: {
          name: 'Jane Foster',
          email: 'jfoster.buyer@sandbox.paypal.com',
          phone: { national_number: '555-901-2345' }
        },
        items: [
          {
            item_name: 'Studio Quality USB Microphone',
            quantity: '1',
            item_cost: { currency_code: 'USD', value: '249.99' }
          }
        ]
      }
    ],
    messages: [
      {
        posted_by: 'BUYER',
        time_posted: new Date().toISOString(),
        content: 'I ordered the microphone to 123 Ocean Blvd, Santa Monica, but it has not shown up!'
      }
    ]
  } as PayPalDispute
};

async function runSimulation() {
  console.log(`[Simulator] Simulating incoming webhook: ${MOCK_WEBHOOK_EVENT.event_type}...`);
  console.log(`[Simulator] Dispute ID: ${MOCK_WEBHOOK_EVENT.resource.dispute_id}`);

  const mockTracking = [
    {
      transaction_id: 'TXN-100293',
      tracking_number: 'UPS-1Z9999999999999999',
      carrier: 'UPS',
      status: 'DELIVERED',
      actual_delivery_date: new Date(Date.now() - 86400000).toISOString()
    }
  ];

  const result = await processDisputePipeline(MOCK_WEBHOOK_EVENT.resource, mockTracking);
  console.log(`[Simulator] Pipeline complete: Dispute ${result.disputeId} is now ${result.status} (Verdict: ${result.recommendation})`);
  try { closeDatabase(); } catch {}
}

runSimulation().catch(err => {
  console.error(err);
  try { closeDatabase(); } catch {}
  process.exit(1);
});
