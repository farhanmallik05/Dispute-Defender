'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Clock, 
  RefreshCw, 
  DollarSign, 
  Layers,
  LayoutGrid,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import DisputeGrid, { DisputeGridRow } from '@/components/queue/DisputeGrid';
import { 
  MetricCardSkeleton, 
  GridRowSkeleton, 
  EmptyStateCard, 
  ErrorStateCard 
} from '@/components/common/StateViews';
import { useResilience } from '@/context/ResilienceContext';

export default function DisputeQueuePage() {
  const { simulatedState, triggerSuccessToast, isSlowNetwork } = useResilience();
  const [disputes, setDisputes] = useState<DisputeGridRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'AWAITING_APPROVAL' | 'SUBMITTED' | 'RESOLVED'>('ALL');
  const [viewMode, setViewMode] = useState<'AG_GRID' | 'COMPACT'>('AG_GRID');
  const [slowLatencyWarning, setSlowLatencyWarning] = useState(false);

  const fetchDisputes = useCallback(async (isRetry = false) => {
    setLoading(true);
    setError(null);
    setSlowLatencyWarning(false);
    const start = Date.now();

    // Check for simulated error
    if (simulatedState === 'ERROR') {
      setTimeout(() => {
        setError('Simulated 500: PayPal Gateway API Gateway Timeout (HTTP 504)');
        setLoading(false);
      }, 500);
      return;
    }

    // Check for simulated slow network
    if (simulatedState === 'SLOW') {
      setSlowLatencyWarning(true);
      await new Promise(r => setTimeout(r, 2600));
    }

    try {
      const res = await fetch('/api/disputes', { cache: 'no-store' });
      const elapsed = Date.now() - start;
      if (elapsed > 2000) {
        setSlowLatencyWarning(true);
      }

      if (!res.ok) {
        throw new Error(`Failed to load disputes: HTTP ${res.status}`);
      }

      const data = await res.json();
      if (simulatedState === 'EMPTY') {
        setDisputes([]);
      } else if (data.disputes) {
        setDisputes(data.disputes);
      }

      if (isRetry) {
        triggerSuccessToast('Dispute queue refreshed successfully!');
      }
    } catch (err: any) {
      console.error('Failed to load disputes:', err);
      setError(err.message || 'Network communication error connecting to dispute pipeline.');
    } finally {
      setLoading(false);
    }
  }, [simulatedState, triggerSuccessToast]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      if (simulatedState === 'SLOW') {
        await new Promise(r => setTimeout(r, 2000));
      }
      const res = await fetch('/api/disputes/sync', { method: 'POST' });
      if (!res.ok) {
        throw new Error(`Sync failed: HTTP ${res.status}`);
      }
      await fetchDisputes();
      triggerSuccessToast('Sandbox Sync Complete: PayPal disputes retrieved & triaged');
    } catch (err: any) {
      console.error('Sync failed:', err);
      setError(err.message || 'Dispute synchronization failed.');
    } finally {
      setSyncing(false);
    }
  };

  const isSimulatedLoading = simulatedState === 'LOADING';
  const showLoading = loading || isSimulatedLoading;
  const showError = Boolean(error || simulatedState === 'ERROR');

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
          <div className="flex items-center border border-slate-300 rounded-lg p-0.5 bg-white shadow-sm text-xs font-semibold">
            <button
              onClick={() => setViewMode('AG_GRID')}
              className={`px-2.5 py-1 rounded-md flex items-center transition-colors ${
                viewMode === 'AG_GRID'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 mr-1" />
              AG Grid
            </button>
            <button
              onClick={() => setViewMode('COMPACT')}
              className={`px-2.5 py-1 rounded-md flex items-center transition-colors ${
                viewMode === 'COMPACT'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 mr-1" />
              Standard
            </button>
          </div>

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

      {/* Slow Network In-Page Alert */}
      {(slowLatencyWarning || isSlowNetwork) && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl flex items-center justify-between text-xs font-medium">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>High latency detected on network path to PayPal Gateway. Requests are being buffered safely.</span>
          </div>
          <button
            onClick={() => fetchDisputes(true)}
            className="text-amber-900 font-bold hover:underline shrink-0 ml-2"
          >
            Retry Sync
          </button>
        </div>
      )}

      {/* Metrics Header Grid (Skeletons when loading) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {showLoading ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : (
          <>
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
          </>
        )}
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

      {/* Main View Area: Error State -> Loading Skeletons -> Empty State -> Grid View */}
      {showError ? (
        <ErrorStateCard
          title="Dispute Queue Synchronization Error"
          message={error || 'Unable to communicate with the local dispute store or PayPal API.'}
          onRetry={() => fetchDisputes(true)}
          retrying={loading}
        />
      ) : showLoading ? (
        <GridRowSkeleton count={5} />
      ) : disputes.length === 0 || filteredDisputes.length === 0 ? (
        <EmptyStateCard
          title={disputes.length === 0 ? "No Active Disputes in Queue" : `No Disputes Matching Filter (${filter})`}
          description={
            disputes.length === 0 
              ? "Your PayPal merchant account is in good standing. No customer disputes, claims, or chargebacks currently require response."
              : `There are currently 0 disputes matching the "${filter}" filter. Switch to "All Disputes" or sync fresh chargebacks from PayPal.`
          }
          actionLabel="Sync from PayPal Sandbox"
          onAction={handleSync}
          loading={syncing}
          secondaryActionLabel="Reset Filter View"
          onSecondaryAction={() => setFilter('ALL')}
        />
      ) : viewMode === 'AG_GRID' ? (
        <DisputeGrid disputes={filteredDisputes} loading={loading} />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 text-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="text-left font-bold text-slate-600">
                  <th className="py-2 px-3">Dispute ID</th>
                  <th className="py-2 px-3">Reason</th>
                  <th className="py-2 px-3">Amount</th>
                  <th className="py-2 px-3">Recommendation</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDisputes.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{d.id}</td>
                    <td className="py-3 px-3">{d.reason.replace(/_/g, ' ')}</td>
                    <td className="py-3 px-3 font-semibold">${d.amount.toFixed(2)} {d.currency}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        d.recommendation === 'FIGHT' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {d.recommendation} ({d.confidenceScore}%)
                      </span>
                    </td>
                    <td className="py-3 px-3">{d.status.replace(/_/g, ' ')}</td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        href={`/disputes/${d.id}`}
                        className="px-2.5 py-1 bg-slate-900 text-white rounded text-xs font-bold hover:bg-slate-800"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
