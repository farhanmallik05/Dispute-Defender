'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Shield, 
  Clock, 
  User, 
  Cpu, 
  Database, 
  ChevronDown, 
  ChevronRight, 
  RefreshCw,
  AlertOctagon
} from 'lucide-react';
import { useResilience } from '@/context/ResilienceContext';
import { GridRowSkeleton, EmptyStateCard, ErrorStateCard } from '@/components/common/StateViews';

interface AuditLogEntry {
  id: string;
  disputeId: string;
  eventType: string;
  actor: 'SYSTEM' | 'AGENT' | 'MERCHANT';
  payload: Record<string, any>;
  timestamp: string;
}

export default function AuditTrailPage() {
  const { simulatedState, triggerSuccessToast } = useResilience();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterActor, setFilterActor] = useState<string>('ALL');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const fetchLogs = useCallback(async (isRetry = false) => {
    setLoading(true);
    setError(null);

    if (simulatedState === 'ERROR') {
      setTimeout(() => {
        setError('Simulated 500: Audit log stream database connection refused.');
        setLoading(false);
      }, 500);
      return;
    }

    if (simulatedState === 'SLOW') {
      await new Promise(r => setTimeout(r, 2200));
    }

    try {
      const res = await fetch('/api/audit', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`Failed to load audit logs: HTTP ${res.status}`);
      }
      const data = await res.json();
      if (simulatedState === 'EMPTY') {
        setLogs([]);
      } else if (data.auditLogs) {
        setLogs(data.auditLogs);
      }

      if (isRetry) {
        triggerSuccessToast('Audit logs refreshed successfully!');
      }
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
      setError(err.message || 'Error communicating with audit stream.');
    } finally {
      setLoading(false);
    }
  }, [simulatedState, triggerSuccessToast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const isSimulatedLoading = simulatedState === 'LOADING';
  const showLoading = loading || isSimulatedLoading;
  const showError = Boolean(error || simulatedState === 'ERROR');

  const filteredLogs = logs.filter(l => {
    if (filterActor === 'ALL') return true;
    return l.actor === filterActor;
  });

  const getActorBadge = (actor: string) => {
    switch (actor) {
      case 'MERCHANT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800">
            <User className="w-3 h-3 mr-1" /> Human Merchant
          </span>
        );
      case 'AGENT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">
            <Cpu className="w-3 h-3 mr-1" /> AI Triage Agent
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700">
            <Database className="w-3 h-3 mr-1" /> System Pipeline
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Link href="/" className="text-slate-400 hover:text-slate-600 text-sm">
              <ArrowLeft className="w-4 h-4 inline mr-1" /> Queue
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-semibold text-slate-700">Audit Trail</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Immutable Regulatory Audit Stream
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Verifiable, append-only chronological log of every webhook, AI decision, and merchant approval action.
          </p>
        </div>

        <button
          onClick={() => fetchLogs(true)}
          disabled={loading}
          className="inline-flex items-center px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
          Refresh Audit Stream
        </button>
      </div>

      {/* Filter Tabs by Actor */}
      <div className="flex border-b border-slate-200 space-x-6 text-xs font-semibold text-slate-600">
        <button
          onClick={() => setFilterActor('ALL')}
          className={`pb-2.5 border-b-2 transition-colors ${
            filterActor === 'ALL' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent hover:text-slate-900'
          }`}
        >
          All Events ({logs.length})
        </button>
        <button
          onClick={() => setFilterActor('SYSTEM')}
          className={`pb-2.5 border-b-2 transition-colors ${
            filterActor === 'SYSTEM' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent hover:text-slate-900'
          }`}
        >
          System Pipeline ({logs.filter(l => l.actor === 'SYSTEM').length})
        </button>
        <button
          onClick={() => setFilterActor('AGENT')}
          className={`pb-2.5 border-b-2 transition-colors ${
            filterActor === 'AGENT' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent hover:text-slate-900'
          }`}
        >
          AI Agent ({logs.filter(l => l.actor === 'AGENT').length})
        </button>
        <button
          onClick={() => setFilterActor('MERCHANT')}
          className={`pb-2.5 border-b-2 transition-colors ${
            filterActor === 'MERCHANT' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent hover:text-slate-900'
          }`}
        >
          Human Merchant ({logs.filter(l => l.actor === 'MERCHANT').length})
        </button>
      </div>

      {showError ? (
        <ErrorStateCard
          title="Failed to Load Audit Stream"
          message={error || 'Unable to query audit logs from SQLite storage.'}
          onRetry={() => fetchLogs(true)}
          retrying={loading}
        />
      ) : showLoading ? (
        <GridRowSkeleton count={6} />
      ) : logs.length === 0 || filteredLogs.length === 0 ? (
        <EmptyStateCard
          title={logs.length === 0 ? "No Audit Events Recorded" : `No Events by ${filterActor}`}
          description={
            logs.length === 0 
              ? "The immutable audit trail is currently empty. Every dispute webhook, PII redaction event, and merchant approval is recorded automatically."
              : `No audit log events have been logged by ${filterActor}. Switch to "All Events" to view complete history.`
          }
          actionLabel="Return to Dispute Queue"
          onAction={() => window.location.href = '/'}
          secondaryActionLabel="Reset Filter"
          onSecondaryAction={() => setFilterActor('ALL')}
        />
      ) : (
        /* Event Table / Timeline */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 text-left font-bold text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-4 w-10"></th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Dispute ID</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredLogs.map(l => {
                  const isExpanded = expandedRow === l.id;
                  return (
                    <React.Fragment key={l.id}>
                      <tr 
                        onClick={() => setExpandedRow(isExpanded ? null : l.id)}
                        className={`hover:bg-slate-50 cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50/40' : ''}`}
                      >
                        <td className="py-3 px-4 text-slate-400">
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-blue-600" /> : <ChevronRight className="w-4 h-4" />}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono">
                          {new Date(l.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {l.eventType}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-blue-600">
                          <Link 
                            href={`/disputes/${l.disputeId}`}
                            onClick={e => e.stopPropagation()}
                            className="hover:underline"
                          >
                            {l.disputeId}
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          {getActorBadge(l.actor)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-400">
                          {isExpanded ? 'Collapse' : 'Inspect Payload'}
                        </td>
                      </tr>

                      {/* Expanded JSON Snapshot Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50">
                          <td colSpan={6} className="p-4 pl-12">
                            <div className="bg-slate-900 rounded-lg p-3 text-slate-200 font-mono text-[11px] overflow-x-auto shadow-inner">
                              <div className="flex justify-between items-center text-slate-400 border-b border-slate-800 pb-1 mb-2 text-[10px]">
                                <span>PAYLOAD SNAPSHOT (CRYPTOGRAPHIC AUDIT PROOF)</span>
                                <span>LOG_ID: {l.id}</span>
                              </div>
                              <pre>{JSON.stringify(l.payload, null, 2)}</pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
