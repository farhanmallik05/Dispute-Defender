'use client';

import React, { useState } from 'react';
import { WifiOff, AlertTriangle, RefreshCw, CheckCircle2, X } from 'lucide-react';
import { useResilience } from '@/context/ResilienceContext';

export default function NetworkStatusBanner() {
  const { isOnline, isRealOnline, simulatedState, setSimulatedState, isSlowNetwork, successToast, clearSuccessToast } = useResilience();
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);

  const checkConnectivity = async () => {
    setChecking(true);
    setCheckResult(null);
    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      if (res.ok) {
        setCheckResult('Connected! Gateway reachable.');
        if (simulatedState === 'OFFLINE') {
          // Keep simulated if user explicitly set it, but notify
        }
      } else {
        setCheckResult('Gateway responded with degraded status.');
      }
    } catch (err: any) {
      setCheckResult('Connection failed. Server unreachable.');
    } finally {
      setChecking(false);
      setTimeout(() => setCheckResult(null), 3000);
    }
  };

  return (
    <>
      {/* Toast Notification for Success Events */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <p className="text-xs font-medium text-slate-100">{successToast}</p>
          </div>
          <button
            onClick={clearSuccessToast}
            className="text-slate-400 hover:text-white p-1 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Offline Status Sticky Banner */}
      {!isOnline && (
        <div className="bg-red-600 text-white px-4 py-2.5 shadow-md flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
          <div className="flex items-center space-x-2">
            <WifiOff className="w-4 h-4 shrink-0 animate-pulse" />
            <span>
              {!isRealOnline
                ? 'No Internet Connection Detected.'
                : 'Offline Mode Active (Simulated).'}
              {' '}Submissions to PayPal Disputes REST API are fail-closed to protect data integrity.
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {checkResult && (
              <span className="bg-red-700 px-2 py-0.5 rounded text-[11px]">
                {checkResult}
              </span>
            )}
            <button
              onClick={checkConnectivity}
              disabled={checking}
              className="bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded transition-colors flex items-center space-x-1"
            >
              <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'Checking...' : 'Check Connection'}</span>
            </button>
            {simulatedState === 'OFFLINE' && (
              <button
                onClick={() => setSimulatedState('NONE')}
                className="bg-white text-red-700 hover:bg-slate-100 px-2 py-1 rounded transition-colors"
              >
                Exit Offline Sim
              </button>
            )}
          </div>
        </div>
      )}

      {/* Slow Network Sticky Indicator */}
      {isSlowNetwork && isOnline && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2 shadow-sm flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Slow Network Mode Active: High latency simulation (3,000ms delay per request). Extended SLA retry timers engaged.
            </span>
          </div>
          <button
            onClick={() => setSimulatedState('NONE')}
            className="bg-amber-600 text-white hover:bg-amber-700 px-2 py-0.5 rounded transition-colors text-[11px]"
          >
            Reset to Normal
          </button>
        </div>
      )}
    </>
  );
}
