'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Inbox, 
  AlertOctagon, 
  RefreshCw, 
  ExternalLink, 
  ShieldCheck, 
  WifiOff, 
  Clock, 
  Sparkles 
} from 'lucide-react';

export function MetricCardSkeleton() {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm animate-pulse flex items-center justify-between">
      <div className="space-y-2 w-3/4">
        <div className="h-3 bg-slate-200 rounded w-1/3"></div>
        <div className="h-7 bg-slate-200 rounded w-2/3"></div>
        <div className="h-3 bg-slate-100 rounded w-1/2"></div>
      </div>
      <div className="w-12 h-12 rounded-lg bg-slate-100 shrink-0"></div>
    </div>
  );
}

export function GridRowSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-4 space-y-3 animate-pulse">
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <div className="h-4 bg-slate-200 rounded w-1/4"></div>
        <div className="h-4 bg-slate-200 rounded w-1/6"></div>
      </div>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 py-2 border-b border-slate-50 last:border-0">
          <div className="h-4 bg-slate-200 rounded w-1/6"></div>
          <div className="h-4 bg-slate-100 rounded w-1/4"></div>
          <div className="h-4 bg-slate-200 rounded w-1/6"></div>
          <div className="h-4 bg-slate-100 rounded w-1/5"></div>
          <div className="h-6 bg-slate-200 rounded w-16 ml-auto"></div>
        </div>
      ))}
    </div>
  );
}

export function EmptyStateCard({
  title = 'No Active Disputes in Queue',
  description = 'Your PayPal merchant account is in good standing. No chargebacks or claims currently require your response.',
  actionLabel = 'Sync Sandbox Disputes',
  onAction,
  loading = false,
  secondaryActionLabel,
  onSecondaryAction
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center max-w-2xl mx-auto my-6 space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
        <Inbox className="w-8 h-8" />
      </div>
      <div className="space-y-1">
        <h3 className="text-xl font-bold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto">{description}</p>
      </div>

      <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
        {onAction && (
          <button
            onClick={onAction}
            disabled={loading}
            className="inline-flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Synchronizing...' : actionLabel}
          </button>
        )}
        {onSecondaryAction && secondaryActionLabel && (
          <button
            onClick={onSecondaryAction}
            className="inline-flex items-center px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
            {secondaryActionLabel}
          </button>
        )}
      </div>

      <div className="pt-4 border-t border-slate-100 flex items-center justify-center space-x-4 text-xs text-slate-400">
        <span className="flex items-center">
          <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Webhook Listener Standing By
        </span>
        <span>·</span>
        <span>Auto-Triage Active</span>
      </div>
    </div>
  );
}

export function ErrorStateCard({
  title = 'Unable to Complete Request',
  message = 'An unexpected communication error occurred while connecting to the backend gateway.',
  onRetry,
  retrying = false
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  return (
    <div className="bg-red-50/60 rounded-2xl border border-red-200 shadow-sm p-8 text-center max-w-xl mx-auto my-6 space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
        <AlertOctagon className="w-7 h-7" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-red-950">{title}</h3>
        <p className="text-xs text-red-700 max-w-md mx-auto">{message}</p>
      </div>

      <div className="pt-2 flex items-center justify-center space-x-3">
        {onRetry && (
          <button
            onClick={onRetry}
            disabled={retrying}
            className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${retrying ? 'animate-spin' : ''}`} />
            {retrying ? 'Retrying...' : 'Retry Request'}
          </button>
        )}
        <Link
          href="/api/health"
          target="_blank"
          className="inline-flex items-center px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg shadow-sm transition-colors"
        >
          <span>System Diagnostics</span>
          <ExternalLink className="w-3 h-3 ml-1.5 text-slate-400" />
        </Link>
      </div>
    </div>
  );
}

export function DossierSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-4 bg-slate-200 rounded w-32"></div>
          <div className="h-8 bg-slate-300 rounded w-64"></div>
        </div>
        <div className="h-8 bg-slate-200 rounded w-28"></div>
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
            <div className="h-6 bg-slate-200 rounded w-1/3"></div>
            <div className="h-4 bg-slate-100 rounded w-3/4"></div>
            <div className="h-4 bg-slate-100 rounded w-1/2"></div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
            <div className="h-5 bg-slate-200 rounded w-1/4"></div>
            <div className="h-10 bg-slate-100 rounded"></div>
            <div className="h-10 bg-slate-100 rounded"></div>
            <div className="h-10 bg-slate-100 rounded"></div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
            <div className="h-5 bg-slate-200 rounded w-1/3"></div>
            <div className="h-28 bg-slate-100 rounded"></div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
            <div className="h-5 bg-slate-200 rounded w-1/2"></div>
            <div className="h-10 bg-slate-200 rounded"></div>
            <div className="h-10 bg-slate-100 rounded"></div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
            <div className="h-4 bg-slate-200 rounded w-1/3"></div>
            <div className="h-6 bg-slate-100 rounded"></div>
            <div className="h-6 bg-slate-100 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
