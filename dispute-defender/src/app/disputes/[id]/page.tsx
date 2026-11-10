'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Send,
  RefreshCw,
  FileText,
  Clock,
  DollarSign,
  Package,
  Truck,
  UserCheck,
  WifiOff,
  Sparkles
} from 'lucide-react';
import { useResilience } from '@/context/ResilienceContext';
import { DossierSkeleton, ErrorStateCard } from '@/components/common/StateViews';

export default function DisputeReviewPage({ params }: { params: { id: string } }) {
  const disputeId = params.id;
  const router = useRouter();
  const { isOnline, simulatedState, triggerSuccessToast, isSlowNetwork } = useResilience();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [showRedactionDiff, setShowRedactionDiff] = useState(false);

  const loadDispute = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (simulatedState === 'ERROR') {
      setTimeout(() => {
        setError('Simulated 500: Failed to retrieve dispute context dossier from upstream.');
        setLoading(false);
      }, 500);
      return;
    }

    if (simulatedState === 'SLOW') {
      await new Promise(r => setTimeout(r, 2200));
    }

    try {
      const res = await fetch(`/api/disputes/${disputeId}`, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`Failed to load dispute: HTTP ${res.status}`);
      }
      const json = await res.json();
      if (json.dispute) {
        setData(json);
        setNotes(json.decision?.draftNotes || '');
      } else {
        throw new Error('Dispute record not found in system.');
      }
    } catch (err: any) {
      console.error('Failed to load dispute details:', err);
      setError(err.message || 'Error communicating with dispute storage.');
    } finally {
      setLoading(false);
    }
  }, [disputeId, simulatedState]);

  useEffect(() => {
    loadDispute();
  }, [loadDispute]);

  const handleApprove = async (action: 'FIGHT' | 'ACCEPT') => {
    if (!isOnline) {
      triggerSuccessToast('Action blocked: Cannot submit to PayPal while offline.');
      return;
    }

    setSubmitting(true);
    setSubmissionResult(null);

    try {
      if (simulatedState === 'SLOW') {
        await new Promise(r => setTimeout(r, 2500));
      }

      const res = await fetch(`/api/disputes/${disputeId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          merchantEditedNotes: notes
        })
      });

      const result = await res.json();
      setSubmissionResult(result);

      if (result.success) {
        triggerSuccessToast(
          action === 'FIGHT'
            ? `Evidence Filed: Submitted response to PayPal for ${disputeId}`
            : `Claim Accepted: Refund issued and $15 penalty fee avoided for ${disputeId}`
        );
      }

      // Refresh data to reflect status update
      const refreshRes = await fetch(`/api/disputes/${disputeId}`);
      const refreshedJson = await refreshRes.json();
      setData(refreshedJson);
    } catch (err: any) {
      console.error('Action failed:', err);
      setSubmissionResult({ error: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const isSimulatedLoading = simulatedState === 'LOADING';
  if (loading || isSimulatedLoading) {
    return <DossierSkeleton />;
  }

  if (error || simulatedState === 'ERROR') {
    return (
      <div className="py-12 space-y-4">
        <Link href="/" className="inline-flex items-center text-xs font-semibold text-blue-600 hover:underline">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Queue
        </Link>
        <ErrorStateCard
          title="Failed to Load Dispute Dossier"
          message={error || 'Unable to retrieve compiled evidence packet from database.'}
          onRetry={loadDispute}
          retrying={loading}
        />
      </div>
    );
  }

  if (!data || !data.dispute) {
    return (
      <div className="py-24 text-center">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900">Dispute Not Found</h2>
        <p className="text-slate-500 mt-1">Dispute ID {disputeId} could not be located in local records.</p>
        <Link href="/" className="mt-4 inline-flex items-center text-sm font-semibold text-blue-600 hover:underline">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Queue
        </Link>
      </div>
    );
  }

  const { dispute, context, decision, auditHistory } = data;
  const isFight = decision?.recommendation === 'FIGHT';
  const isSubmitted = dispute.status === 'EVIDENCE_SUBMITTED';
  const isAccepted = dispute.status === 'CLAIM_ACCEPTED';

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-[#003087] hover:text-[#0070ba]">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Dispute Queue
        </Link>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowRedactionDiff(!showRedactionDiff)}
            className="inline-flex items-center rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Eye className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
            {showRedactionDiff ? 'Hide Redaction Diff' : 'Inspect PII Redaction Diff'}
          </button>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
            Stage: {dispute.lifeCycleStage}
          </span>
        </div>
      </div>

      {/* Redaction Diff Preview Modal / Drawer */}
      {showRedactionDiff && (
        <div className="space-y-4 rounded-lg border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-xl">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center">
                <ShieldCheck className="w-5 h-5 text-emerald-400 mr-2" />
                PII redaction inspection
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Compare stored source fields with the sanitized context used for triage.
              </p>
            </div>
            <button
              onClick={() => setShowRedactionDiff(false)}
              className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 bg-slate-800 rounded"
            >
              Close Diff
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <p className="text-slate-400 font-bold mb-2 uppercase tracking-wider">Stored source fields</p>
              <pre className="text-slate-300 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(
                  {
                    messages: context?.buyerMessages || [],
                    order: context?.orderData || {}
                  },
                  null,
                  2
                )}
              </pre>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-emerald-950">
              <p className="text-emerald-400 font-bold mb-2 uppercase tracking-wider">Sanitized triage context</p>
              <pre className="text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(context?.redactedContext || {}, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* AI Verdict Banner */}
      <div
        className={`rounded-lg border-l-4 p-6 shadow-sm ${
          isFight
            ? 'border-y border-r border-y-emerald-200 border-r-emerald-200 border-l-emerald-500 bg-emerald-50/80'
            : 'border-y border-r border-y-amber-200 border-r-amber-200 border-l-[#ffc439] bg-amber-50/80'
        }`}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isFight ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                }`}
              >
                {decision?.recommendation || 'ANALYZING'}
              </span>
              <span className="text-xs font-bold text-slate-600">
                Confidence: {decision?.confidenceScore || 0}%
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-2">
              {decision?.summaryReason || 'AI analysis completed based on factual order and shipment verification.'}
            </h2>
          </div>

          <div className="text-right sm:border-l sm:border-slate-300 sm:pl-6">
            <p className="text-xs font-medium uppercase text-slate-500">Disputed Sum</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">
              ${dispute.amount.toFixed(2)} {dispute.currency}
            </p>
            <p className="text-xs text-slate-500 mt-1">Due: {dispute.dueDate ? new Date(dispute.dueDate).toLocaleDateString() : 'Immediate'}</p>
          </div>
        </div>
      </div>

      {/* Regulatory & Decision Governance Notice */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3.5 text-[11px] text-slate-600 leading-relaxed">
        <p className="flex items-center font-semibold text-slate-800 mb-1">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mr-1.5" />
          Regulatory & Decision Governance Notice
        </p>
        Dispute Defender operates under strict human-in-the-loop merchant authorization. Confidence scores and draft rebuttals reflect automated evidentiary matching against PayPal Seller Protection guidelines and do not constitute legal advice or guaranteed adjudication outcomes. Submission to PayPal occurs exclusively upon your explicit authorization.
      </div>

      {/* Main Review Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Evidence Checklist & Order Context */}
        <div className="lg:col-span-2 space-y-6">
          {/* Evidence Checklist */}
          <div className="paypal-card space-y-4 p-6">
            <h3 className="text-base font-bold text-slate-900 flex items-center">
              <CheckCircle2 className="w-5 h-5 text-blue-600 mr-2" />
              Verified Evidence Checklist (Fact-Traceability)
            </h3>
            <p className="text-xs text-slate-500">
              Each assertion shows the source field used by the triage decision.
            </p>

            <div className="space-y-3 pt-2">
              {decision?.evidenceChecklist?.map((item: any, idx: number) => (
                <div key={idx} className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/70 flex items-start space-x-3">
                  <div className="mt-0.5">
                    {item.verified ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-amber-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">{item.claimedFact}</p>
                      <span className="text-[10px] font-mono font-medium px-2 py-0.5 bg-slate-200 text-slate-700 rounded">
                        {item.sourceField}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{item.notes}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipment & Tracking Details */}
          <div className="paypal-card space-y-4 p-6">
            <h3 className="text-base font-bold text-slate-900 flex items-center">
              <Truck className="w-5 h-5 text-blue-600 mr-2" />
              Carrier Fulfillment Record
            </h3>

            {context?.trackingData && context.trackingData.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {context.trackingData.map((t: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase text-slate-500">{t.carrier}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {t.status}
                      </span>
                    </div>
                    <p className="font-mono font-bold text-slate-900 text-base">{t.trackingNumber}</p>
                    {t.deliveryDate && (
                      <p className="text-xs text-slate-500">
                        Delivered on: {new Date(t.deliveryDate).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                No tracking numbers uploaded for this transaction. Recommendation is set to ACCEPT to avoid dispute penalties.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Merchant approval action panel */}
        <div className="space-y-6">
          <div className="paypal-card space-y-5 border-t-4 border-t-[#003087] p-6">
            <h3 className="text-base font-bold text-slate-900 flex items-center">
              <Send className="w-5 h-5 text-blue-600 mr-2" />
              Merchant approval
            </h3>
            <p className="text-xs text-slate-500">
              Review the draft, edit the note if needed, then explicitly approve a PayPal action.
            </p>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="paypal-eyebrow">Draft note</label>
                <span className={`text-[11px] font-mono font-semibold ${notes.length > 3800 ? 'text-red-600' : notes.length > 3000 ? 'text-amber-600' : 'text-slate-400'}`}>
                  {notes.length} / 4000
                </span>
              </div>

              {/* Suggested note templates */}
              {!isSubmitted && !isAccepted && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Suggested inserts</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setNotes(prev => prev ? `${prev}\n\nCarrier tracking confirms package delivered to buyer address prior to dispute filing date. Fulfilled under PayPal Seller Protection.` : 'Carrier tracking confirms package delivered to buyer address prior to dispute filing date. Fulfilled under PayPal Seller Protection.')}
                      className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition-colors"
                    >
                      + Proof of Delivery
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotes(prev => prev ? `${prev}\n\nItem delivered in brand new condition matching catalog specifications. Buyer has not initiated an authorized return under our stated store policy.` : 'Item delivered in brand new condition matching catalog specifications. Buyer has not initiated an authorized return under our stated store policy.')}
                      className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition-colors"
                    >
                      + Item As Described
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotes(prev => prev ? `${prev}\n\nOrder placed with matching billing address and delivered to verified shipping address. Timestamps confirm merchant fulfillment.` : 'Order placed with matching billing address and delivered to verified shipping address. Timestamps confirm merchant fulfillment.')}
                      className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition-colors"
                    >
                      + Authorized Order
                    </button>
                  </div>
                </div>
              )}

              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                maxLength={4000}
                rows={6}
                disabled={isSubmitted || isAccepted}
                className="w-full rounded-md border border-slate-300 p-3 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#0070ba] disabled:bg-slate-100 disabled:text-slate-500"
                placeholder="Enter rebuttal remarks for PayPal dispute adjudicator..."
              />
            </div>

            {/* Submission Status Alerts */}
            {submissionResult && (
              <div
                className={`p-4 rounded-xl text-xs space-y-2 ${
                  submissionResult.success
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border border-red-200 text-red-900'
                }`}
              >
                {submissionResult.success ? (
                  <div>
                    <div className="flex items-center space-x-1.5 font-bold text-sm text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Evidence submission recorded</span>
                    </div>
                    <p className="mt-1 text-slate-700">
                      Dispute status updated to <strong>{submissionResult.status}</strong>.
                    </p>
                    <div className="pt-2 flex items-center gap-3">
                      <Link
                        href="/"
                        className="inline-flex items-center text-xs font-bold text-blue-600 hover:underline"
                      >
                        <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Return to Queue
                      </Link>
                      <Link
                        href="/audit"
                        className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900"
                      >
                        Inspect Audit Trail &rarr;
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="font-bold flex items-center text-red-800">
                      <AlertTriangle className="w-4 h-4 mr-1.5 text-red-600" />
                      Submission failed
                    </p>
                    <p className="text-red-700">{submissionResult.error}</p>
                  </div>
                )}
              </div>
            )}

            {/* Offline Safeguard Alert */}
            {!isOnline && !isSubmitted && !isAccepted && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start space-x-2">
                <WifiOff className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <p>
                  <strong>Offline Protection:</strong> PayPal REST submissions are blocked while disconnected. Your drafted rebuttal and evidence checklist are preserved.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            {!isSubmitted && !isAccepted ? (
              <div className="space-y-3 pt-2">
                <button
                  onClick={() => handleApprove('FIGHT')}
                  disabled={submitting || !isOnline}
                  className="flex w-full items-center justify-center rounded-md bg-[#0070ba] px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#003087] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  {submitting 
                    ? isSlowNetwork ? 'Submitting to PayPal (High Latency)...' : 'Submitting to PayPal...' 
                    : !isOnline ? 'Offline — Reconnect to Submit' : 'Approve & Submit Evidence'}
                </button>

                <button
                  onClick={() => handleApprove('ACCEPT')}
                  disabled={submitting || !isOnline}
                  className="flex w-full items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Accept Claim & Refund Buyer
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-center">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 mb-1">
                  {dispute.status}
                </span>
                <p className="text-xs text-slate-500 mt-1">This dispute has already been submitted and resolved by the merchant.</p>
              </div>
            )}
          </div>

          {/* Audit History Card */}
          <div className="paypal-card space-y-4 p-6">
            <h4 className="paypal-eyebrow">Recent activity</h4>
            <div className="space-y-2 text-xs">
              {auditHistory?.map((a: any, idx: number) => (
                <div key={idx} className="border-l-2 border-[#0070ba] py-1 pl-3">
                  <p className="font-semibold text-slate-800">{a.eventType}</p>
                  <p className="text-[10px] text-slate-400">
                    By {a.actor} at {new Date(a.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
