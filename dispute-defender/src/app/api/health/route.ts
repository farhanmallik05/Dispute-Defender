import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { disputes, auditLogs } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, any> = {};

  // 1. Database Health & Record Counts
  try {
    const allDisputes = await db.select().from(disputes);
    const allAuditLogs = await db.select().from(auditLogs);
    checks.database = {
      status: 'healthy',
      driver: 'node:sqlite (DatabaseSync)',
      disputeRecords: allDisputes.length,
      auditLogEntries: allAuditLogs.length
    };
  } catch (err: any) {
    checks.database = {
      status: 'unhealthy',
      error: err.message
    };
  }

  // 2. PayPal Credentials & Mode check
  const paypalClientId = process.env.PAYPAL_CLIENT_ID;
  const paypalSecret = process.env.PAYPAL_CLIENT_SECRET;
  const paypalWebhookId = process.env.PAYPAL_WEBHOOK_ID;
  const paypalEnv = process.env.PAYPAL_ENV || process.env.PAYPAL_MODE || 'sandbox';
  const integrityMode = process.env.INTEGRITY_MODE || 'demo';

  checks.paypal = {
    configured: Boolean(paypalClientId && paypalSecret),
    environment: paypalEnv,
    integrityMode,
    hasWebhookId: Boolean(paypalWebhookId)
  };

  // 3. AI Triage Engine status
  const aiProvider = process.env.AI_PROVIDER || 'gemini';
  const hasAiKey = Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);
  checks.aiTriage = {
    provider: aiProvider,
    apiKeyConfigured: hasAiKey,
    fallbackEngine: 'deterministic_heuristics_active'
  };

  const isHealthy = checks.database.status === 'healthy';
  const responseTimeMs = Date.now() - startTime;

  return NextResponse.json(
    {
      status: isHealthy ? 'healthy' : 'degraded',
      service: 'dispute-defender',
      version: '1.0.0',
      uptimeSeconds: Math.round(process.uptime()),
      responseTimeMs,
      timestamp: new Date().toISOString(),
      checks
    },
    { status: isHealthy ? 200 : 503 }
  );
}
