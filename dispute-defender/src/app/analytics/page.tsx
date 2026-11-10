'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft,
  Table,
  CheckCircle2
} from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { useResilience } from '@/context/ResilienceContext';
import { 
  MetricCardSkeleton, 
  GridRowSkeleton, 
  EmptyStateCard, 
  ErrorStateCard 
} from '@/components/common/StateViews';

interface ReasonSummaryRow {
  reason: string;
  count: number;
  totalAmount: number;
  submittedAmount: number;
  resolvedCount: number;
  winRate: number | null;
  primaryDefense: string;
}

export default function AnalyticsDashboardPage() {
  const { simulatedState } = useResilience();
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (simulatedState === 'ERROR') {
      setTimeout(() => {
        setError('Simulated 500: Analytics data aggregator failed to compile dispute metrics.');
        setLoading(false);
      }, 500);
      return;
    }

    if (simulatedState === 'SLOW') {
      await new Promise(r => setTimeout(r, 2200));
    }

    try {
      const res = await fetch('/api/disputes', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`Failed to load disputes: HTTP ${res.status}`);
      }
      const json = await res.json();
      if (simulatedState === 'EMPTY') {
        setDisputes([]);
      } else if (json.disputes) {
        setDisputes(json.disputes);
      }
    } catch (err: any) {
      console.error('Failed to load disputes for analytics:', err);
      setError(err.message || 'Error communicating with analytics pipeline.');
    } finally {
      setLoading(false);
    }
  }, [simulatedState]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isSimulatedLoading = simulatedState === 'LOADING';
  const showLoading = loading || isSimulatedLoading;
  const showError = Boolean(error || simulatedState === 'ERROR');

  const totalAtRisk = disputes.reduce((sum, d) => sum + (d.amount || 0), 0);
  const submittedDisputes = disputes.filter(d => d.status === 'EVIDENCE_SUBMITTED');
  const totalSubmitted = submittedDisputes.reduce((sum, d) => sum + (d.amount || 0), 0);
  const resolvedDisputes = disputes.filter(d => d.status === 'RESOLVED');
  const sellerWonDisputes = resolvedDisputes.filter(d => d.outcomeCode === 'RESOLVED_SELLER_FAVOUR');
  const feesSaved = disputes.filter(d => d.status === 'CLAIM_ACCEPTED').length * 15;

  const realWinRate = resolvedDisputes.length > 0
    ? Math.round((sellerWonDisputes.length / resolvedDisputes.length) * 100)
    : null;

  // Group by reason for AG Grid rowData
  const rowData: ReasonSummaryRow[] = useMemo(() => {
    const map: Record<string, { count: number; total: number; submitted: number; resolved: number }> = {};
    for (const d of disputes) {
      const r = d.reason || 'OTHER';
      if (!map[r]) map[r] = { count: 0, total: 0, submitted: 0, resolved: 0 };
      map[r].count++;
      map[r].total += d.amount || 0;
      if (d.status === 'EVIDENCE_SUBMITTED') {
        map[r].submitted += d.amount || 0;
      }
      if (d.status === 'RESOLVED') map[r].resolved++;
    }

    return Object.keys(map).map(r => {
      const item = map[r];
      let defense = 'Submit Carrier Proof of Fulfillment';
      if (r === 'MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED') defense = 'Provide Item Specs & Return Policy Logs';
      if (r === 'UNAUTHORISED') defense = 'Provide Buyer IP Authorization & Delivery Scan';

      return {
        reason: r.replace(/_/g, ' '),
        count: item.count,
        totalAmount: item.total,
        submittedAmount: item.submitted,
        resolvedCount: item.resolved,
        winRate: null,
        primaryDefense: defense
      };
    });
  }, [disputes]);

  const columnDefs = useMemo<ColDef<ReasonSummaryRow>[]>(() => {
    return [
      {
        headerName: 'Dispute Reason',
        field: 'reason',
        flex: 1,
        minWidth: 220,
        cellClass: 'font-semibold text-slate-900',
        sortable: true,
        filter: true
      },
      {
        headerName: 'Claim Count',
        field: 'count',
        width: 140,
        sortable: true,
        filter: 'agNumberColumnFilter'
      },
      {
        headerName: 'Total at Risk',
        field: 'totalAmount',
        width: 160,
        valueFormatter: p => p.value !== undefined ? `$${p.value.toFixed(2)} USD` : '',
        cellClass: 'font-semibold text-slate-900',
        sortable: true
      },
      {
        headerName: 'Evidence Submitted',
        field: 'submittedAmount',
        width: 160,
        valueFormatter: p => p.value !== undefined ? `$${p.value.toFixed(2)} USD` : '',
        cellClass: 'font-semibold text-emerald-600',
        sortable: true
      },
      {
        headerName: 'Resolved Outcomes',
        field: 'resolvedCount',
        width: 150,
        sortable: true
      },
      {
        headerName: 'Win Rate',
        field: 'winRate',
        width: 130,
        valueFormatter: p => p.value === null || p.value === undefined ? 'N/A' : `${p.value}%`,
        cellClass: 'font-bold text-blue-600',
        sortable: true
      },
      {
        headerName: 'Recommended Defense Strategy',
        field: 'primaryDefense',
        flex: 1.5,
        minWidth: 260,
        cellClass: 'text-xs text-slate-600'
      }
    ];
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Link href="/" className="text-slate-400 hover:text-slate-600 text-sm">
              <ArrowLeft className="w-4 h-4 inline mr-1" /> Queue
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-semibold text-slate-700">Overview</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Dispute overview
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            A factual view of open cases, submissions, and received outcomes.
          </p>
        </div>

        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
          Demo data only
        </span>
      </div>

      {showError ? (
        <ErrorStateCard
          title="Failed to Load Risk Analytics"
          message={error || 'Unable to aggregate dispute metrics from storage.'}
          onRetry={loadData}
          retrying={loading}
        />
      ) : showLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </div>
          <GridRowSkeleton count={4} />
        </div>
      ) : disputes.length === 0 ? (
        <EmptyStateCard
          title="No Analytics Data Available"
          description="Analytics and defense playbooks activate automatically once customer disputes are synchronized from PayPal."
          actionLabel="View Queue"
          onAction={() => window.location.href = '/'}
        />
      ) : (
        <>
          {/* KPI Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
             <div className="paypal-card border-l-4 border-l-[#0070ba] p-5">
               <p className="paypal-eyebrow">Open amount at risk</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">${totalAtRisk.toFixed(2)}</p>
              <p className="text-xs text-slate-400 mt-1">{disputes.length} active claims</p>
            </div>

             <div className="paypal-card border-l-4 border-l-emerald-500 p-5">
               <p className="paypal-eyebrow">Evidence submitted</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">${totalSubmitted.toFixed(2)}</p>
              <p className="text-xs text-emerald-600 mt-1">{submittedDisputes.length} dossiers filed</p>
            </div>

             <div className="paypal-card border-l-4 border-l-[#ffc439] p-5">
               <p className="paypal-eyebrow">Seller-favour outcomes</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {realWinRate !== null ? `${realWinRate}%` : 'Awaiting Result'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {resolvedDisputes.length > 0 ? `${sellerWonDisputes.length}/${resolvedDisputes.length} adjudicated in seller favor` : 'Based on real PayPal outcomes'}
              </p>
            </div>

             <div className="paypal-card p-5">
               <p className="paypal-eyebrow">Accepted claims</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">${feesSaved}.00</p>
               <p className="text-xs text-slate-400 mt-1">Recorded local decisions</p>
            </div>

             <div className="paypal-card p-5">
               <p className="paypal-eyebrow">Response deadlines</p>
               <p className="mt-1 text-2xl font-bold text-slate-900">{disputes.filter(d => d.dueDate).length}</p>
               <p className="mt-1 text-xs text-slate-400">Cases with a stored due date</p>
            </div>
          </div>

          {/* AG Grid Reason Matrix Card */}
           <div className="paypal-card overflow-hidden">
               <div className="flex items-center justify-between border-b border-slate-200 bg-white p-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center">
                   <Table className="mr-2 h-4 w-4 text-[#0070ba]" />
                   Dispute reason summary
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                   Sort and filter the local dispute records by reason and amount.
                </p>
              </div>
            </div>

            <div className="ag-theme-quartz w-full" style={{ height: '320px' }}>
              <AgGridReact<ReasonSummaryRow>
                rowData={rowData}
                columnDefs={columnDefs}
                domLayout="autoHeight"
                rowHeight={48}
                headerHeight={42}
                animateRows={true}
              />
            </div>
          </div>

        </>
      )}
    </div>
  );
}
