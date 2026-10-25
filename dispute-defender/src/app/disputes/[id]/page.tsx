'use client';

import React, { useState, useEffect } from 'react';
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
  UserCheck
} from 'lucide-react';

export default function DisputeReviewPage({ params }: { params: { id: string } }) {
  const disputeId = params.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [showRedactionDiff, setShowRedactionDiff] = useState(false);

  useEffect(() => {
    async function loadDispute() {
      try {
        const res = await fetch(`/api/disputes/${disputeId}`);
        const json = await res.json();
        if (json.dispute) {
          setData(json);
          setNotes(json.decision?.draftNotes || '');
        }
      } catch (err) {
        console.error('Failed to load dispute details:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDispute();
  }, [disputeId]);

  const handleApprove = async (action: 'FIGHT' | 'ACCEPT') => {
    setSubmitting(true);
    setSubmissionResult(null);

    try {
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

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
        <p className="text-slate-600 font-medium">Assembling dispute dossier & redaction logs...</p>
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
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Dispute Queue
        </Link>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowRedactionDiff(!showRedactionDiff)}
            className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <Eye className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
            {showRedactionDiff ? 'Hide Redaction Diff' : 'Inspect PII Redaction Diff'}
          </button>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            Stage: {dispute.lifeCycleStage}
          </span>
        </div>
      </div>

      {/* Redaction Diff Preview Modal / Drawer */}
      {showRedactionDiff && (
        <div className="bg-slate-900 text-slate-100 p-6 rounded-2xl shadow-xl border border-slate-800 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center">
                <ShieldCheck className="w-5 h-5 text-emerald-400 mr-2" />
                Zero-Trust PII Redaction Engine: Live Inspection
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Verifiable proof that buyer email, phone, street address, and full name are stripped prior to LLM inference.
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
              <p className="text-slate-400 font-bold mb-2 uppercase tracking-wider">Raw Input Data (Private Store)</p>
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
              <p className="text-emerald-400 font-bold mb-2 uppercase tracking-wider">Sanitized Payload Delivered to AI Model</p>
              <pre className="text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(context?.redactedContext || {}, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* AI Verdict Banner */}
      <div
        className={`p-6 rounded-2xl border shadow-sm ${
          isFight
            ? 'bg-emerald-50/80 border-emerald-200'
            : 'bg-amber-50/80 border-amber-200'
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

      {/* Main Review Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Evidence Checklist & Order Context */}
        <div className="lg:col-span-2 space-y-6">
          {/* Evidence Checklist */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center">
              <CheckCircle2 className="w-5 h-5 text-blue-600 mr-2" />
              Verified Evidence Checklist (Fact-Traceability)
            </h3>
            <p className="text-xs text-slate-500">
              Every factual assertion below is directly mapped to immutable records retrieved from carrier and transaction APIs.
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
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
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

        {/* Right Column: 1-Click Merchant Approval Action Panel */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
            <h3 className="text-base font-bold text-slate-900 flex items-center">
              <Send className="w-5 h-5 text-blue-600 mr-2" />
              1-Click Merchant Approval Gate
            </h3>
            <p className="text-xs text-slate-500">
              The AI agent cannot submit without your explicit sign-off. Edit the draft rebuttal note if desired, then click approve.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-600">Draft Rebuttal Note (Editable)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={6}
                disabled={isSubmitted || isAccepted}
                className="w-full text-xs font-mono p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                placeholder="Enter rebuttal remarks for PayPal dispute adjudicator..."
              />
            </div>

            {/* Submission Status Alerts */}
            {submissionResult && (
              <div
                className={`p-4 rounded-lg text-xs ${
                  submissionResult.success
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}
              >
                {submissionResult.success ? (
                  <div>
                    <p className="font-bold flex items-center">
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                      Action Successfully Filed with PayPal!
                    </p>
                    <p className="mt-1">
                      Status moved to: <strong>{submissionResult.status}</strong>. Evidence visible in PayPal Resolution Center.
                    </p>
                  </div>
                ) : (
                  <p className="font-bold">Error: {submissionResult.error}</p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            {!isSubmitted && !isAccepted ? (
              <div className="space-y-3 pt-2">
                <button
                  onClick={() => handleApprove('FIGHT')}
                  disabled={submitting}
                  className="w-full py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-colors flex items-center justify-center disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  {submitting ? 'Submitting to PayPal...' : 'Approve & Submit Evidence'}
                </button>

                <button
                  onClick={() => handleApprove('ACCEPT')}
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center disabled:opacity-50"
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
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Audit Trail (Chain of Custody)</h4>
            <div className="space-y-2 text-xs">
              {auditHistory?.map((a: any, idx: number) => (
                <div key={idx} className="border-l-2 border-blue-500 pl-3 py-1">
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
