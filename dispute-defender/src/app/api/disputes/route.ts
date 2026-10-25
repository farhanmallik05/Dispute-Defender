import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { disputes, triageDecisions } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const allDisputes = await db
      .select({
        id: disputes.id,
        status: disputes.status,
        reason: disputes.reason,
        amount: disputes.amount,
        currency: disputes.currency,
        dueDate: disputes.dueDate,
        lifeCycleStage: disputes.lifeCycleStage,
        transactionId: disputes.transactionId,
        createdAt: disputes.createdAt,
        updatedAt: disputes.updatedAt,
        recommendation: triageDecisions.recommendation,
        confidenceScore: triageDecisions.confidenceScore,
        summaryReason: triageDecisions.summaryReason
      })
      .from(disputes)
      .leftJoin(triageDecisions, eq(disputes.id, triageDecisions.disputeId))
      .orderBy(desc(disputes.createdAt));

    return NextResponse.json({ disputes: allDisputes });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
