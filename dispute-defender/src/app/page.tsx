'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  ArrowRight, 
  RefreshCw, 
  DollarSign, 
  FileText,
  Filter
} from 'lucide-react';

interface DisputeSummary {
  id: string;
  status: string;
  reason: string;
  amount: number;
  currency: string;
  dueDate: string | null;
  lifeCycleStage: string;
  recommendation: 'FIGHT' | 'ACCEPT' | null;
  confidenceScore: number | null;
  summaryReason: string | null;
}

export default function DisputeQueuePage() {
  const [disputes, setDisputes] = useState<DisputeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'AWAITING_APPROVAL' | 'SUBMITTED' | 'RESOLVED'>('ALL');

  const fetchDisputes = async () => {
    try {
      const res = await fetch('/api/disputes');
      const data = await res.json();
      if (data.disputes) {
        setDisputes(data.disputes);
      }
    } catch (err) {
      console.error('Failed to load disputes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch('/api/disputes/sync', { method: 'POST' });
      await fetchDisputes();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  const calculateHoursLeft = (dueDateStr: string | null) => {
    if (!dueDateStr) return null;
    const due = new Date(dueDateStr).getTime();
    const now = Date.now();
    const diffHours = Math.round((due - now) / (1000 * 60 * 60));
    return diffHours;
  };

  const filteredDisputes = disputes.filter(d => {
    if (filter === 'ALL') return true;
    if (filter === 'AWAITING_APPROVAL') return d.status === 'AWAITING_APPROVAL';
    if (filter === 'SUBMITTED') return d.status === 'EVIDENCE_SUBMITTED';
    if (filter === 'RESOLVED') return d.status === 'CLAIM_ACCEPTED' || d.status === 'RESOLVED';
    return true;
  });

  const totalAtRisk = disputes.reduce((sum, d) => sum + (d.amount || 0), 0);
  const awaitingCount = disputes.filter(d => d.status === 'AWAITING_APPROVAL').length;
  const submittedCount = disputes.filter(d => d.status === 'EVIDENCE_SUBMITTED').length;

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Dispute Command Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time PayPal dispute defense queue sorted by seller response SLA urgency.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Sandbox'}
          </button>
        </div>
      </div>

      {/* Metrics Header Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-slate-500">Active Capital at Risk</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">${totalAtRisk.toFixed(2)}</p>
            <p className="text-xs text-slate-400 mt-1">Across {disputes.length} open disputes</p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-slate-500">Awaiting 1-Click Approval</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{awaitingCount}</p>
            <p className="text-xs text-slate-400 mt-1">Triage dossiers prepared</p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-slate-500">Evidence Packets Filed</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{submittedCount}</p>
            <p className="text-xs text-slate-400 mt-1">Live in PayPal Resolution Center</p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 text-sm font-medium text-slate-600">
        <button
          onClick={() => setFilter('ALL')}
          className={`pb-3 border-b-2 transition-colors ${
            filter === 'ALL' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent hover:text-slate-900'
          }`}
        >
          All Disputes ({disputes.length})
        </button>
        <button
          onClick={() => setFilter('AWAITING_APPROVAL')}
          className={`pb-3 border-b-2 transition-colors ${
            filter === 'AWAITING_APPROVAL' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent hover:text-slate-900'
          }`}
        >
          Awaiting Approval ({awaitingCount})
        </button>
        <button
          onClick={() => setFilter('SUBMITTED')}
          className={`pb-3 border-b-2 transition-colors ${
            filter === 'SUBMITTED' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent hover:text-slate-900'
          }`}
        >
          Evidence Submitted ({submittedCount})
        </button>
        <button
          onClick={() => setFilter('RESOLVED')}
          className={`pb-3 border-b-2 transition-colors ${
            filter === 'RESOLVED' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent hover:text-slate-900'
          }`}
        >
          Resolved / Refunded
        </button>
      </div>

      {/* Dispute Queue Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading dispute queue...</div>
        ) : filteredDisputes.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900">No disputes found in this view</h3>
            <p className="text-sm text-slate-500 mt-1">Click "Sync Sandbox" to pull active disputes.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Urgency / Due Date</th>
                  <th className="py-3.5 px-4">Dispute ID</th>
                  <th className="py-3.5 px-4">Claim Reason</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">AI Recommendation</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredDisputes.map(dispute => {
                  const hoursLeft = calculateHoursLeft(dispute.dueDate);
                  const isUrgent = hoursLeft !== null && hoursLeft <= 48;

                  return (
                    <tr key={dispute.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-4 whitespace-nowrap">
                        {hoursLeft !== null ? (
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                              isUrgent
                                ? 'bg-red-50 text-red-700 border border-red-200 animate-pulse'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            <Clock className="w-3 h-3 mr-1" />
                            {hoursLeft > 24 ? `${Math.round(hoursLeft / 24)} days left` : `${hoursLeft}h left`}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">No deadline</span>
                        )}
                      </td>
                      <td className="py-4 px-4 font-mono font-medium text-slate-900">
                        {dispute.id}
                      </td>
                      <td className="py-4 px-4 max-w-xs truncate text-slate-700">
                        {dispute.reason.replace(/_/g, ' ')}
                      </td>
                      <td className="py-4 px-4 font-semibold text-slate-900">
                        ${dispute.amount.toFixed(2)} {dispute.currency}
                      </td>
                      <td className="py-4 px-4">
                        {dispute.recommendation ? (
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${
                              dispute.recommendation === 'FIGHT'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {dispute.recommendation} ({dispute.confidenceScore}%)
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Triaging...</span>
                        )}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            dispute.status === 'AWAITING_APPROVAL'
                              ? 'bg-amber-100 text-amber-800'
                              : dispute.status === 'EVIDENCE_SUBMITTED'
                              ? 'bg-blue-100 text-blue-800'
                              : dispute.status === 'CLAIM_ACCEPTED'
                              ? 'bg-slate-200 text-slate-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {dispute.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <Link
                          href={`/disputes/${dispute.id}`}
                          className="inline-flex items-center px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
                        >
                          Review & Approve
                          <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
