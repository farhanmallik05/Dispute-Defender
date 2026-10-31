'use client';

import React, { useState } from 'react';
import { 
  Sliders, 
  WifiOff, 
  Clock, 
  AlertOctagon, 
  Inbox, 
  Loader2, 
  CheckCircle, 
  ChevronUp, 
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { useResilience, SimulatedState } from '@/context/ResilienceContext';

export default function ResilienceToolbar() {
  const { simulatedState, setSimulatedState, triggerSuccessToast } = useResilience();
  const [isOpen, setIsOpen] = useState(false);

  const states: { id: SimulatedState; label: string; icon: any; color: string; desc: string }[] = [
    { id: 'NONE', label: 'Live Data', icon: CheckCircle, color: 'text-emerald-500', desc: 'Real live API & SQLite records' },
    { id: 'EMPTY', label: 'Empty State', icon: Inbox, color: 'text-slate-400', desc: 'Zero disputes in queue' },
    { id: 'ERROR', label: 'Error 500', icon: AlertOctagon, color: 'text-red-500', desc: 'API gateway failure & retry' },
    { id: 'LOADING', label: 'Loading Skeleton', icon: Loader2, color: 'text-blue-500', desc: 'Persistent shimmer skeletons' },
    { id: 'SLOW', label: 'Slow 3G Network', icon: Clock, color: 'text-amber-500', desc: '3,000ms artificial network latency' },
    { id: 'OFFLINE', label: 'Offline Mode', icon: WifiOff, color: 'text-red-600', desc: 'Simulated network disconnect' },
  ];

  return (
    <div className="fixed bottom-3 left-4 z-40 max-w-xl transition-all">
      {isOpen ? (
        <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-slate-700/80 p-4 space-y-3 w-80 sm:w-[480px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center space-x-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <span className="text-xs font-bold tracking-wide uppercase text-slate-200 flex items-center">
                <Sliders className="w-3.5 h-3.5 mr-1 text-blue-400" />
                Resilience & UI State Sandbox
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
              title="Minimize Toolbar"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Test how Dispute Defender gracefully handles edge cases, zero-data situations, network drops, and server errors:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {states.map(s => {
              const Icon = s.icon;
              const isActive = simulatedState === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setSimulatedState(s.id);
                    if (s.id === 'NONE') {
                      triggerSuccessToast('Restored Live Pipeline mode');
                    } else {
                      triggerSuccessToast(`Simulating: ${s.label}`);
                    }
                  }}
                  className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                    isActive
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-inner'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 mb-1">
                    <Icon className={`w-3.5 h-3.5 ${s.color} ${isActive && s.id === 'LOADING' ? 'animate-spin' : ''}`} />
                    <span className="text-xs font-bold">{s.label}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 leading-tight">
                    {s.desc}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-800">
            <span>Client State: <strong className="text-slate-300 font-mono">{simulatedState}</strong></span>
            <button
              onClick={() => triggerSuccessToast('Test Toast Notification Triggered!')}
              className="text-blue-400 hover:text-blue-300 font-medium flex items-center"
            >
              <Sparkles className="w-3 h-3 mr-1" /> Test Success Toast
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center space-x-2 bg-slate-900/90 hover:bg-slate-900 text-white px-3.5 py-2 rounded-full shadow-lg border border-slate-700/80 text-xs font-semibold backdrop-blur-sm transition-all hover:scale-105"
        >
          <Sliders className="w-3.5 h-3.5 text-blue-400" />
          <span>UI State Sandbox</span>
          {simulatedState !== 'NONE' && (
            <span className="px-1.5 py-0.2 bg-blue-500 text-white rounded-full text-[10px] font-bold">
              {simulatedState}
            </span>
          )}
          <ChevronUp className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
        </button>
      )}
    </div>
  );
}
