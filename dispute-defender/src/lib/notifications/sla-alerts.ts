import { db } from '@/lib/db';
import { disputes } from '@/lib/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { getEnv } from '@/lib/env';

export interface AlertNotification {
  disputeId: string;
  disputeAmount: string;
  claimReason: string;
  dueDate: string;
  hoursRemaining: number;
  urgency: 'CRITICAL' | 'URGENT';
}

export interface SlaCheckResult {
  checkedAt: string;
  totalExpiring: number;
  criticalCount: number;
  urgentCount: number;
  alerts: AlertNotification[];
  webhookDispatched: boolean;
}

/**
 * Scans all active disputes awaiting approval and calculates remaining SLA hours.
 * Triggers webhook alerts when claims approach response deadlines.
 */
export async function checkExpiringDisputes(referenceTime = Date.now()): Promise<SlaCheckResult> {
  const allDisputes = await db.select().from(disputes) as any[];
  const openDisputes = allDisputes.filter(d => d.status === 'AWAITING_APPROVAL' && Boolean(d.dueDate));

  const alerts: AlertNotification[] = [];

  for (const d of openDisputes) {
    if (!d.dueDate) continue;
    const dueTime = new Date(d.dueDate).getTime();
    const diffHours = (dueTime - referenceTime) / (1000 * 60 * 60);

    if (diffHours <= 24 && diffHours > 0) {
      alerts.push({
        disputeId: d.id,
        disputeAmount: `${d.amount} ${d.currency}`,
        claimReason: d.reason,
        dueDate: d.dueDate,
        hoursRemaining: Math.round(diffHours),
        urgency: 'CRITICAL',
      });
    } else if (diffHours <= 48 && diffHours > 24) {
      alerts.push({
        disputeId: d.id,
        disputeAmount: `${d.amount} ${d.currency}`,
        claimReason: d.reason,
        dueDate: d.dueDate,
        hoursRemaining: Math.round(diffHours),
        urgency: 'URGENT',
      });
    }
  }

  const currentEnv = getEnv();
  let webhookDispatched = false;

  if (alerts.length > 0 && currentEnv.ALERT_WEBHOOK_URL) {
    webhookDispatched = await dispatchWebhookAlert(currentEnv.ALERT_WEBHOOK_URL, alerts);
  }

  return {
    checkedAt: new Date(referenceTime).toISOString(),
    totalExpiring: alerts.length,
    criticalCount: alerts.filter(a => a.urgency === 'CRITICAL').length,
    urgentCount: alerts.filter(a => a.urgency === 'URGENT').length,
    alerts,
    webhookDispatched,
  };
}

async function dispatchWebhookAlert(webhookUrl: string, alerts: AlertNotification[]): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'Dispute Defender SLA Monitor',
        alertCount: alerts.length,
        criticalCount: alerts.filter(a => a.urgency === 'CRITICAL').length,
        items: alerts,
        actionUrl: 'http://localhost:3000',
      }),
    });
    return response.ok;
  } catch (error) {
    console.error('[AlertDispatcher] Failed to dispatch webhook alert:', error);
    return false;
  }
}
