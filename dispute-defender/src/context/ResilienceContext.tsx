'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type SimulatedState = 'NONE' | 'EMPTY' | 'ERROR' | 'LOADING' | 'SLOW' | 'OFFLINE';

interface ResilienceContextType {
  isOnline: boolean;
  isRealOnline: boolean;
  simulatedState: SimulatedState;
  setSimulatedState: (state: SimulatedState) => void;
  isSlowNetwork: boolean;
  successToast: string | null;
  triggerSuccessToast: (message: string) => void;
  clearSuccessToast: () => void;
}

const ResilienceContext = createContext<ResilienceContextType | undefined>(undefined);

export function ResilienceProvider({ children }: { children: ReactNode }) {
  const [isRealOnline, setIsRealOnline] = useState(true);
  const [simulatedState, setSimulatedState] = useState<SimulatedState>('NONE');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsRealOnline(navigator.onLine);

      const handleOnline = () => setIsRealOnline(true);
      const handleOffline = () => setIsRealOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  const triggerSuccessToast = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4500);
  };

  const clearSuccessToast = () => setSuccessToast(null);

  // Combined online state (real network status AND simulated state)
  const isOnline = isRealOnline && simulatedState !== 'OFFLINE';
  const isSlowNetwork = simulatedState === 'SLOW';

  return (
    <ResilienceContext.Provider
      value={{
        isOnline,
        isRealOnline,
        simulatedState,
        setSimulatedState,
        isSlowNetwork,
        successToast,
        triggerSuccessToast,
        clearSuccessToast
      }}
    >
      {children}
    </ResilienceContext.Provider>
  );
}

export function useResilience() {
  const context = useContext(ResilienceContext);
  if (!context) {
    throw new Error('useResilience must be used within a ResilienceProvider');
  }
  return context;
}
