import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Dispute Defender | Autonomous PayPal Dispute Agent',
  description: 'Triages PayPal disputes, builds the evidence packet, and files it after 1-click merchant approval.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                DD
              </div>
              <div>
                <Link href="/" className="text-xl font-bold tracking-tight text-slate-900 hover:text-blue-600">
                  Dispute Defender
                </Link>
                <span className="ml-2.5 inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  PayPal Sandbox
                </span>
              </div>
            </div>
            <nav className="flex items-center space-x-6 text-sm font-medium">
              <Link href="/" className="text-slate-700 hover:text-blue-600 transition-colors">
                Dispute Queue
              </Link>
              <Link href="/analytics" className="text-slate-700 hover:text-blue-600 transition-colors">
                Risk Analytics
              </Link>
              <Link href="/audit" className="text-slate-700 hover:text-blue-600 transition-colors">
                Audit Trail
              </Link>
              <div className="h-4 w-px bg-slate-200" />
              <div className="flex items-center text-xs text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                Pipeline Active
              </div>
            </nav>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
            <div>Dispute Defender · Open Source PayPal AI Agent · MIT License</div>
            <div className="text-slate-400">Render Workflows · AG Grid · APIMatic · Vercel AI SDK</div>
          </div>
        </footer>
      </body>
    </html>
  );
}
