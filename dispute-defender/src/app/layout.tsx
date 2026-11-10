import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { ResilienceProvider } from '@/context/ResilienceContext';
import NetworkStatusBanner from '@/components/common/NetworkStatusBanner';
import ResilienceToolbar from '@/components/common/ResilienceToolbar';

export const metadata: Metadata = {
  title: 'Dispute Defender | Autonomous PayPal Dispute Agent',
  description: 'Triages PayPal disputes, builds the evidence packet, and files it after 1-click merchant approval.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isDemoMode = process.env.INTEGRITY_MODE === 'demo';

  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-[#f5f7fa] text-slate-900">
        <ResilienceProvider>
          <NetworkStatusBanner />
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#003087] text-sm font-bold tracking-tight text-white shadow-sm">
                  DD
                </div>
                <div>
                  <Link href="/" className="text-[17px] font-semibold tracking-tight text-[#003087] hover:text-[#0070ba]">
                    Dispute Defender
                  </Link>
                  <span className="ml-2 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    {isDemoMode ? 'Demo mode' : 'PayPal Sandbox'}
                  </span>
                </div>
              </div>
              <nav className="flex items-center gap-1 text-sm font-medium" aria-label="Primary navigation">
                <Link href="/" className="rounded-md px-3 py-2 text-slate-600 transition-colors hover:bg-slate-50 hover:text-[#003087]">
                  Dispute Queue
                </Link>
                <Link href="/analytics" className="rounded-md px-3 py-2 text-slate-600 transition-colors hover:bg-slate-50 hover:text-[#003087]">
                  Overview
                </Link>
                <Link href="/audit" className="rounded-md px-3 py-2 text-slate-600 transition-colors hover:bg-slate-50 hover:text-[#003087]">
                  Activity
                </Link>
                <div className="mx-2 hidden h-5 w-px bg-slate-200 sm:block" />
                <Link
                  href="/api/health"
                  target="_blank"
                  title="View system health and diagnostics"
                  className="hidden items-center rounded-md border border-slate-200 px-3 py-2 font-mono text-[11px] text-slate-600 transition-colors hover:border-[#0070ba] hover:text-[#003087] sm:flex"
                >
                  <span className="mr-2 h-2 w-2 rounded-full bg-emerald-500" />
                  Health
                </Link>
              </nav>
            </div>
          </header>

          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </main>

          <footer className="border-t border-slate-200 bg-white py-5 text-xs text-slate-500">
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 sm:flex-row sm:px-6 lg:px-8">
              <div>Dispute Defender · PayPal dispute review workspace</div>
              <div className="flex items-center gap-3 text-slate-400">
                <Link href="/api/health" target="_blank" className="hover:text-blue-600 transition-colors">
                  System health
                </Link>
                <span aria-hidden="true">·</span>
                <span>Demo-ready prototype</span>
              </div>
            </div>
          </footer>

          <ResilienceToolbar />
        </ResilienceProvider>
      </body>
    </html>
  );
}
