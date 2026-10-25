import { processDisputePipeline } from '../../../dispute-defender/src/lib/workflows/dispute-pipeline';

async function main() {
  console.log('Running processDisputePipeline...');
  const dispute = {
    dispute_id: 'PP-D-TEST-NODE24',
    reason: 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED',
    dispute_amount: { currency_code: 'USD', value: '10.00' },
    dispute_life_cycle_stage: 'INQUIRY'
  } as any;
  const result = await processDisputePipeline(dispute, []);
  console.log('Result:', result);
}

main();
