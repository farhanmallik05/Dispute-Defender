/**
 * Sandbox Dispute Seeder & Test Rig
 * 
 * Pre-populates the local database with realistic PayPal sandbox dispute scenarios:
 * 1. PP-D-27801: Merchandise Not Received -> FedEx DELIVERED (Strong FIGHT)
 * 2. PP-D-27802: Merchandise Not Received -> No Tracking Uploaded (Strong ACCEPT)
 * 3. PP-D-27803: Significantly Not As Described -> Buyer claim without return (FIGHT)
 * 4. PP-D-27804: Merchandise Not Received -> USPS IN_TRANSIT (Moderate FIGHT)
 */

import { processDisputePipeline } from '../lib/workflows/dispute-pipeline';
import { PayPalDispute } from '../types/dispute';
import { closeDatabase } from '../lib/db';

const SEED_DISPUTES: Array<{ dispute: PayPalDispute; tracking?: any[] }> = [
  {
    dispute: {
      dispute_id: 'PP-D-27801',
      create_time: '2026-10-25T10:15:00Z',
      update_time: '2026-10-25T10:15:00Z',
      dispute_amount: { currency_code: 'USD', value: '189.00' },
      status: 'WAITING_FOR_SELLER_RESPONSE',
      reason: 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED',
      dispute_life_cycle_stage: 'CHARGEBACK',
      seller_response_due_date: '2026-11-04T10:15:00Z',
      allowed_response_options: ['PROVIDE_EVIDENCE', 'ACCEPT_CLAIM'],
      disputed_transactions: [
        {
          seller_transaction_id: 'TXN-9081234',
          gross_amount: { currency_code: 'USD', value: '189.00' },
          buyer: {
            name: 'Sarah Connor',
            email: 'sconnor.buyer@sandbox.com',
            phone: { national_number: '555-019-2834' }
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
          posted_by: 'BUYER',
          time_posted: '2026-10-25T10:15:00Z',
          content: 'I ordered the display last week to 742 Evergreen Terrace, Springfield, but I never received anything at all. Please refund my $189!'
        }
      ],
      links: [
        {
          href: 'https://api-m.sandbox.paypal.com/v1/customer/disputes/PP-D-27801/provide-evidence',
          rel: 'provide-evidence',
          method: 'POST'
        },
        {
          href: 'https://api-m.sandbox.paypal.com/v1/customer/disputes/PP-D-27801/accept-claim',
          rel: 'accept-claim',
          method: 'POST'
        }
      ]
    },
    tracking: [
      {
        transaction_id: 'TXN-9081234',
        tracking_number: '122533485',
        carrier: 'FEDEX',
        status: 'DELIVERED',
        actual_delivery_date: '2026-10-23T14:30:00Z'
      }
    ]
  },
  {
    dispute: {
      dispute_id: 'PP-D-27802',
      create_time: '2026-10-25T12:00:00Z',
      update_time: '2026-10-25T12:00:00Z',
      dispute_amount: { currency_code: 'USD', value: '45.00' },
      status: 'WAITING_FOR_SELLER_RESPONSE',
      reason: 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED',
      dispute_life_cycle_stage: 'INQUIRY',
      seller_response_due_date: '2026-11-05T12:00:00Z',
      allowed_response_options: ['PROVIDE_EVIDENCE', 'ACCEPT_CLAIM'],
      disputed_transactions: [
        {
          seller_transaction_id: 'TXN-9081235',
          gross_amount: { currency_code: 'USD', value: '45.00' },
          buyer: {
            name: 'John Doe',
            email: 'johndoe.shopper@example.org',
            phone: { national_number: '555-432-1098' }
          },
          items: [
            {
              item_name: 'Custom Mechanical Keycap Set',
              quantity: '1',
              item_cost: { currency_code: 'USD', value: '45.00' }
            }
          ]
        }
      ],
      messages: [
        {
          posted_by: 'BUYER',
          time_posted: '2026-10-25T12:00:00Z',
          content: 'Where are my keycaps? It has been two weeks and I have no tracking update!'
        }
      ],
      links: [
        {
          href: 'https://api-m.sandbox.paypal.com/v1/customer/disputes/PP-D-27802/provide-evidence',
          rel: 'provide-evidence',
          method: 'POST'
        },
        {
          href: 'https://api-m.sandbox.paypal.com/v1/customer/disputes/PP-D-27802/accept-claim',
          rel: 'accept-claim',
          method: 'POST'
        }
      ]
    },
    tracking: [] // Intentionally empty to test ACCEPT / REFUND path!
  },
  {
    dispute: {
      dispute_id: 'PP-D-27803',
      create_time: '2026-10-26T08:30:00Z',
      update_time: '2026-10-26T08:30:00Z',
      dispute_amount: { currency_code: 'USD', value: '320.00' },
      status: 'WAITING_FOR_SELLER_RESPONSE',
      reason: 'MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED',
      dispute_life_cycle_stage: 'CHARGEBACK',
      seller_response_due_date: '2026-10-28T08:30:00Z', // Urgent! 48 hours left
      allowed_response_options: ['PROVIDE_EVIDENCE', 'ACCEPT_CLAIM'],
      disputed_transactions: [
        {
          seller_transaction_id: 'TXN-9081236',
          gross_amount: { currency_code: 'USD', value: '320.00' },
          buyer: {
            name: 'Michael Scott',
            email: 'mscott@dundermifflin.com',
            phone: { national_number: '555-888-9999' }
          },
          items: [
            {
              item_name: 'Vintage Leather Office Chair',
              quantity: '1',
              item_cost: { currency_code: 'USD', value: '320.00' }
            }
          ]
        }
      ],
      messages: [
        {
          posted_by: 'BUYER',
          time_posted: '2026-10-26T08:30:00Z',
          content: 'The chair color is slightly darker brown than shown in photo. I demand a full refund and will not ship it back!'
        }
      ],
      links: [
        {
          href: 'https://api-m.sandbox.paypal.com/v1/customer/disputes/PP-D-27803/provide-evidence',
          rel: 'provide-evidence',
          method: 'POST'
        },
        {
          href: 'https://api-m.sandbox.paypal.com/v1/customer/disputes/PP-D-27803/accept-claim',
          rel: 'accept-claim',
          method: 'POST'
        }
      ]
    },
    tracking: [
      {
        transaction_id: 'TXN-9081236',
        tracking_number: '9400111899562534567890',
        carrier: 'USPS',
        status: 'DELIVERED',
        actual_delivery_date: '2026-10-22T11:00:00Z'
      }
    ]
  }
];

async function seed() {
  console.log('--- Seeding Sandbox Disputes into Dispute Defender ---');
  for (const item of SEED_DISPUTES) {
    console.log(`Processing dispute ${item.dispute.dispute_id} (${item.dispute.reason})...`);
    const result = await processDisputePipeline(item.dispute, item.tracking);
    console.log(
      `✓ ${result.disputeId} processed -> Status: ${result.status}, Recommendation: ${result.recommendation}`
    );
  }
  console.log('--- Seeding Complete: All test scenarios ready in database ---');
}

seed()
  .then(() => {
    closeDatabase();
  })
  .catch(err => {
    console.error('Seeding failed:', err);
    try { closeDatabase(); } catch {}
    process.exit(1);
  });
