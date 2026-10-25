import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auditLogs } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const logs = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.timestamp))
      .limit(100);

    return NextResponse.json({
      auditLogs: logs.map(l => ({
        ...l,
        payload: JSON.parse(l.payload || '{}')
      }))
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
