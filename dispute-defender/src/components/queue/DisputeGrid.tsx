'use client';

import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams, CellKeyDownEvent, RowDoubleClickedEvent } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { Clock, ArrowRight, Download, Search, ShieldAlert, CheckCircle2, Filter, Keyboard } from 'lucide-react';

export interface DisputeGridRow {
  id: string;
  status: string;
  reason: string;
  amount: number;
  currency: string;
  dueDate: string | null;
  lifeCycleStage: string;
  transactionId?: string;
  recommendation: 'FIGHT' | 'ACCEPT' | null;
  confidenceScore: number | null;
  summaryReason: string | null;
}

interface DisputeGridProps {
  disputes: DisputeGridRow[];
  loading?: boolean;
}

export default function DisputeGrid({ disputes, loading }: DisputeGridProps) {
  const router = useRouter();
  const gridRef = useRef<AgGridReact<DisputeGridRow>>(null);
  const [quickFilterText, setQuickFilterText] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'AWAITING_APPROVAL' | 'CRITICAL' | 'EVIDENCE_SUBMITTED' | 'RESOLVED'>('ALL');

  // Filter disputes according to active quick tab
  const filteredDisputes = useMemo(() => {
    if (activeTab === 'ALL') return disputes;
    if (activeTab === 'AWAITING_APPROVAL') return disputes.filter(d => d.status === 'AWAITING_APPROVAL');
    if (activeTab === 'EVIDENCE_SUBMITTED') return disputes.filter(d => d.status === 'EVIDENCE_SUBMITTED');
    if (activeTab === 'RESOLVED') return disputes.filter(d => d.status === 'RESOLVED' || d.status === 'CLAIM_ACCEPTED');
    if (activeTab === 'CRITICAL') {
      const now = Date.now();
      return disputes.filter(d => {
        if (!d.dueDate) return false;
        const diffHours = (new Date(d.dueDate).getTime() - now) / (1000 * 60 * 60);
         return diffHours <= 24;
      });
    }
    return disputes;
  }, [disputes, activeTab]);

  const handleRowDoubleClicked = useCallback((e: RowDoubleClickedEvent<DisputeGridRow>) => {
    if (e.data?.id) {
      router.push(`/disputes/${e.data.id}`);
    }
  }, [router]);

  const handleCellKeyDown = useCallback((e: CellKeyDownEvent<DisputeGridRow>) => {
    const keyboardEvent = e.event as unknown as KeyboardEvent;
    if (keyboardEvent?.key === 'Enter' && e.data?.id) {
      router.push(`/disputes/${e.data.id}`);
    }
  }, [router]);

  // 1. Urgency / Due Date Renderer
  const UrgencyCellRenderer = useCallback((params: ICellRendererParams<DisputeGridRow>) => {
    const dueDateStr = params.data?.dueDate;
    if (!dueDateStr) {
      return <span className="text-slate-400 text-xs">No deadline</span>;
    }

    const due = new Date(dueDateStr).getTime();
    const now = Date.now();
    const diffHours = Math.round((due - now) / (1000 * 60 * 60));
     const isOverdue = diffHours <= 0;
     const isUrgent = !isOverdue && diffHours <= 48;
     const isCritical = !isOverdue && diffHours <= 24;

    return (
      <div className="flex items-center h-full">
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
             isOverdue || isCritical
               ? 'bg-red-100 text-red-800 border border-red-300'
              : isUrgent
              ? 'bg-amber-100 text-amber-800 border border-amber-300'
              : 'bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Clock className="w-3 h-3 mr-1" />
           {isOverdue ? 'Overdue' : diffHours > 24 ? `${Math.round(diffHours / 24)}d left` : `${diffHours}h left`}
        </span>
      </div>
    );
  }, []);

  // 2. AI Recommendation Renderer
  const RecommendationCellRenderer = useCallback((params: ICellRendererParams<DisputeGridRow>) => {
    const rec = params.data?.recommendation;
    const score = params.data?.confidenceScore;

    if (!rec) {
      return <span className="text-xs text-slate-400 italic">Triaging...</span>;
    }

    return (
      <div className="flex items-center h-full">
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${
            rec === 'FIGHT'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}
        >
          {rec === 'FIGHT' ? (
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
          ) : (
            <ShieldAlert className="w-3 h-3 mr-1 text-amber-600" />
          )}
          {rec} ({score}%)
        </span>
      </div>
    );
  }, []);

  // 3. Status Badge Renderer
  const StatusCellRenderer = useCallback((params: ICellRendererParams<DisputeGridRow>) => {
    const status = params.value || 'NEEDS_TRIAGE';
    let colorClass = 'bg-slate-100 text-slate-700';

    if (status === 'AWAITING_APPROVAL') colorClass = 'bg-amber-100 text-amber-800 border border-amber-200';
    if (status === 'EVIDENCE_SUBMITTED') colorClass = 'bg-blue-100 text-blue-800 border border-blue-200';
    if (status === 'CLAIM_ACCEPTED') colorClass = 'bg-purple-100 text-purple-800 border border-purple-200';
    if (status === 'RESOLVED') colorClass = 'bg-emerald-100 text-emerald-800 border border-emerald-200';

    return (
      <div className="flex items-center h-full">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
          {status.replace(/_/g, ' ')}
        </span>
      </div>
    );
  }, []);

  // 4. Action Button Renderer
  const ActionCellRenderer = useCallback((params: ICellRendererParams<DisputeGridRow>) => {
    const id = params.data?.id;
    if (!id) return null;

    return (
      <div className="flex items-center justify-end h-full">
        <Link
          href={`/disputes/${id}`}
          className="inline-flex items-center rounded-md bg-[#003087] px-3 py-1 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#001c64]"
        >
          Review & Approve
          <ArrowRight className="w-3 h-3 ml-1" />
        </Link>
      </div>
    );
  }, []);

  // Column Definitions
  const columnDefs = useMemo<ColDef<DisputeGridRow>[]>(() => {
    return [
      {
        headerName: 'Urgency / SLA',
        field: 'dueDate',
        cellRenderer: UrgencyCellRenderer,
        width: 150,
        sortable: true,
        comparator: (valueA, valueB) => {
          if (!valueA) return 1;
          if (!valueB) return -1;
          return new Date(valueA).getTime() - new Date(valueB).getTime();
        }
      },
      {
        headerName: 'Dispute ID',
        field: 'id',
        width: 170,
        cellClass: 'font-mono text-xs font-semibold text-slate-900',
        sortable: true,
        filter: 'agTextColumnFilter'
      },
      {
        headerName: 'Claim Reason',
        field: 'reason',
        flex: 1,
        minWidth: 200,
        valueFormatter: params => params.value ? params.value.replace(/_/g, ' ') : '',
        sortable: true,
        filter: 'agTextColumnFilter'
      },
      {
        headerName: 'Amount at Risk',
        field: 'amount',
        width: 150,
        valueFormatter: params => params.value !== undefined ? `$${params.value.toFixed(2)} ${params.data?.currency || 'USD'}` : '',
        cellClass: 'font-semibold text-slate-900',
        sortable: true,
        filter: 'agNumberColumnFilter'
      },
      {
        headerName: 'Stage',
        field: 'lifeCycleStage',
        width: 140,
        sortable: true,
        filter: 'agTextColumnFilter'
      },
      {
        headerName: 'AI Recommendation',
        field: 'recommendation',
        cellRenderer: RecommendationCellRenderer,
        width: 180,
        sortable: true
      },
      {
        headerName: 'Status',
        field: 'status',
        cellRenderer: StatusCellRenderer,
        width: 170,
        sortable: true
      },
      {
        headerName: 'Action',
        cellRenderer: ActionCellRenderer,
        width: 160,
        sortable: false,
        pinned: 'right'
      }
    ];
  }, [UrgencyCellRenderer, RecommendationCellRenderer, StatusCellRenderer, ActionCellRenderer]);

  const defaultColDef = useMemo<ColDef>(() => ({
    resizable: true
  }), []);

  const handleExportCsv = useCallback(() => {
    gridRef.current?.api.exportDataAsCsv({
      fileName: `paypal-disputes-${new Date().toISOString().slice(0, 10)}.csv`
    });
  }, []);

  return (
    <div className="space-y-3">
      {/* Search, Filter Tabs and Export Bar */}
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={quickFilterText}
              onChange={e => setQuickFilterText(e.target.value)}
              placeholder="Search dispute ID or reason"
              aria-label="Search disputes"
              className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0070ba]"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              {filteredDisputes.length} case{filteredDisputes.length === 1 ? '' : 's'} shown
            </span>
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              title="Export filtered dispute queue to CSV"
            >
              <Download className="w-3.5 h-3.5 mr-1 text-slate-500" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-2.5 text-xs">
          <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5">
            <span className="text-slate-400 text-[11px] font-medium mr-1 flex items-center">
              <Filter className="w-3 h-3 mr-1" /> View:
            </span>
            {(
              [
                { id: 'ALL', label: 'All Disputes', count: disputes.length },
                { id: 'AWAITING_APPROVAL', label: 'Awaiting Review', count: disputes.filter(d => d.status === 'AWAITING_APPROVAL').length },
                { id: 'CRITICAL', label: 'Critical (<24h)', count: disputes.filter(d => {
                  if (!d.dueDate) return false;
                  const diff = (new Date(d.dueDate).getTime() - Date.now()) / (1000 * 60 * 60);
                   return diff <= 24;
                }).length },
                { id: 'EVIDENCE_SUBMITTED', label: 'Evidence Filed', count: disputes.filter(d => d.status === 'EVIDENCE_SUBMITTED').length },
                { id: 'RESOLVED', label: 'Settled', count: disputes.filter(d => d.status === 'RESOLVED' || d.status === 'CLAIM_ACCEPTED').length }
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#003087] text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {tab.label} {tab.count > 0 && <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-blue-800 text-blue-100' : 'bg-slate-100 text-slate-600'}`}>{tab.count}</span>}
              </button>
            ))}
          </div>

          <div className="hidden lg:flex items-center text-[11px] text-slate-500 space-x-1">
            <Keyboard className="w-3.5 h-3.5 text-slate-400 mr-1" />
            <span>Double-click or press <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-[10px] font-mono">Enter</kbd> to inspect</span>
          </div>
        </div>
      </div>

      {/* Mobile Card Stack View (< md) */}
      <div className="md:hidden space-y-3">
        {filteredDisputes.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm font-medium bg-white rounded-lg border border-slate-200">
            No disputes matching this filter view.
          </div>
        ) : (
          filteredDisputes.map(d => (
            <div key={d.id} className="paypal-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#003087]">{d.id}</span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  d.status === 'EVIDENCE_SUBMITTED' ? 'bg-emerald-100 text-emerald-800' :
                  d.status === 'AWAITING_APPROVAL' ? 'bg-amber-100 text-amber-800' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {d.status}
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <div>
                  <p className="text-xs font-semibold text-slate-800">{d.reason.replace(/_/g, ' ')}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{d.transactionId || d.lifeCycleStage}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">${d.amount.toFixed(2)} {d.currency}</p>
                  <p className="text-[10px] text-slate-400">{d.dueDate ? new Date(d.dueDate).toLocaleDateString() : 'No deadline'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  d.recommendation === 'FIGHT' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  d.recommendation === 'ACCEPT' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  'bg-slate-50 text-slate-600'
                }`}>
                  {d.recommendation} ({d.confidenceScore}%)
                </span>
                <Link
                  href={`/disputes/${d.id}`}
                  className="inline-flex items-center rounded-md bg-[#003087] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#001c64]"
                >
                  Review
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop AG Grid Container */}
      <div className="hidden md:block paypal-grid ag-theme-quartz w-full overflow-hidden rounded-lg border border-slate-200 shadow-sm">
        <AgGridReact<DisputeGridRow>
          ref={gridRef}
          rowData={filteredDisputes}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          quickFilterText={quickFilterText}
          rowSelection="single"
          onRowDoubleClicked={handleRowDoubleClicked}
          onCellKeyDown={handleCellKeyDown}
          pagination={true}
          paginationPageSize={10}
          paginationPageSizeSelector={[10, 25, 50]}
          domLayout="autoHeight"
          rowHeight={48}
          headerHeight={42}
          animateRows={true}
          loading={loading}
          overlayNoRowsTemplate="<div class='p-8 text-center text-slate-400 text-sm font-medium'>No disputes matching this filter view.</div>"
        />
      </div>
    </div>
  );
}
