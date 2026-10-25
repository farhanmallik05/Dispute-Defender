import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { disputes, disputeContexts, triageDecisions, auditLogs } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const disputeId = params.id;

    const disputeRecord = await db
      .select()
      .from(disputes)
      .where(eq(disputes.id, disputeId))
      .get();

    if (!disputeRecord) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    const contextRecord = await db
      .select()
      .from(disputeContexts)
      .where(eq(disputeContexts.disputeId, disputeId))
      .get();

    const decisionRecord = await db
      .select()
      .from(triageDecisions)
      .where(eq(triageDecisions.disputeId, disputeId))
      .get();

    const auditHistory = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.disputeId, disputeId))
      .orderBy(desc(auditLogs.timestamp));

    return NextResponse.json({
      dispute: disputeRecord,
      context: contextRecord ? {
        orderData: JSON.parse(contextRecord.orderData || '{}'),
        trackingData: JSON.parse(contextRecord.trackingData || '[]'),
        buyerMessages: JSON.parse(contextRecord.buyerMessages || '[]'),
        redactedContext: JSON.parse(contextRecord.redactedContext || '{}')
      } : null,
      decision: decisionRecord ? {
        ...decisionRecord,
        evidenceChecklist: JSON.parse(decisionRecord.evidenceChecklist || '[]')
      } : null,
      auditHistory: auditHistory.map(a => ({
        ...a,
        payload: JSON.parse(a.payload || '{}')
      }))
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
