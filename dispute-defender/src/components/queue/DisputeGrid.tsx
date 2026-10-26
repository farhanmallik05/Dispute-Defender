'use client';

import React, { useMemo, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { Clock, ArrowRight, Download, Search, ShieldAlert, CheckCircle2 } from 'lucide-react';

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
  const gridRef = useRef<AgGridReact<DisputeGridRow>>(null);
  const [quickFilterText, setQuickFilterText] = useState('');

  // 1. Urgency / Due Date Renderer
  const UrgencyCellRenderer = useCallback((params: ICellRendererParams<DisputeGridRow>) => {
    const dueDateStr = params.data?.dueDate;
    if (!dueDateStr) {
      return <span className="text-slate-400 text-xs">No deadline</span>;
    }

    const due = new Date(dueDateStr).getTime();
    const now = Date.now();
    const diffHours = Math.round((due - now) / (1000 * 60 * 60));
    const isUrgent = diffHours <= 48;
    const isCritical = diffHours <= 24;

    return (
      <div className="flex items-center h-full">
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
            isCritical
              ? 'bg-red-100 text-red-800 border border-red-300 animate-pulse'
              : isUrgent
              ? 'bg-amber-100 text-amber-800 border border-amber-300'
              : 'bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Clock className="w-3 h-3 mr-1" />
          {diffHours > 24 ? `${Math.round(diffHours / 24)}d left` : `${diffHours}h left`}
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
          className="inline-flex items-center px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
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
      {/* Search and Export Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={quickFilterText}
            onChange={e => setQuickFilterText(e.target.value)}
            placeholder="Search all disputes..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            Powered by <strong>AG Grid</strong>
          </span>
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-colors"
            title="Export dispute queue to CSV"
          >
            <Download className="w-3.5 h-3.5 mr-1 text-slate-500" />
            Export CSV
          </button>
        </div>
      </div>

      {/* AG Grid Container */}
      <div className="ag-theme-quartz w-full shadow-sm rounded-xl overflow-hidden border border-slate-200">
        <AgGridReact<DisputeGridRow>
          ref={gridRef}
          rowData={disputes}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          quickFilterText={quickFilterText}
          pagination={true}
          paginationPageSize={10}
          paginationPageSizeSelector={[10, 25, 50]}
          domLayout="autoHeight"
          rowHeight={48}
          headerHeight={42}
          animateRows={true}
          loading={loading}
          overlayNoRowsTemplate="<div class='p-8 text-center text-slate-400 text-sm'>No active disputes found in this filter view.</div>"
        />
      </div>
    </div>
  );
}
