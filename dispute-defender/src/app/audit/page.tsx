'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, Clock, User, Cpu, Database, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';

interface AuditLogEntry {
  id: string;
  disputeId: string;
  eventType: string;
  actor: 'SYSTEM' | 'AGENT' | 'MERCHANT';
  payload: Record<string, any>;
  timestamp: string;
}

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterActor, setFilterActor] = useState<string>('ALL');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/audit');
      const data = await res.json();
      if (data.auditLogs) {
        setLogs(data.auditLogs);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

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
            Immutable Audit Trail & Compliance Log
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Every webhook, tool execution, PII redaction snapshot, model recommendation, and merchant click recorded cryptographically.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-blue-600" /> Refresh Log
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-3 text-xs font-bold">
        {['ALL', 'SYSTEM', 'AGENT', 'MERCHANT'].map(actor => (
          <button
            key={actor}
            onClick={() => setFilterActor(actor)}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filterActor === actor ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {actor === 'ALL' ? 'All Events' : `${actor} Events`}
          </button>
        ))}
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading audit trail...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No audit events found.</div>
        ) : (
          <div className="divide-y divide-slate-200 text-sm">
            {filteredLogs.map(log => {
              const isExpanded = expandedRow === log.id;

              return (
                <div key={log.id} className="p-4 hover:bg-slate-50/80 transition-colors">
                  <div
                    onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                      <div>
                        <span className="font-mono text-xs font-bold text-slate-900 mr-2">
                          {log.disputeId}
                        </span>
                        <span className="font-semibold text-slate-800 text-sm">{log.eventType}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-xs text-slate-500">
                      {getActorBadge(log.actor)}
                      <span className="flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Expandable JSON Payload Viewer */}
                  {isExpanded && (
                    <div className="mt-3 pl-7">
                      <div className="p-3 bg-slate-950 text-emerald-400 rounded-lg text-xs font-mono overflow-x-auto">
                        <pre>{JSON.stringify(log.payload, null, 2)}</pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
