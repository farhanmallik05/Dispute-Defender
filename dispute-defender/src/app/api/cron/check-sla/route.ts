import { NextResponse } from 'next/server';
import { checkExpiringDisputes } from '@/lib/notifications/sla-alerts';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await checkExpiringDisputes();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to check SLA status' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const result = await checkExpiringDisputes();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to check SLA status' }, { status: 500 });
  }
}
