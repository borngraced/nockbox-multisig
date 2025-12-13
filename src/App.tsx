import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Menu, X, Hammer, PenTool, Clock } from 'lucide-react';
import { ConnectWalletButton, WalletStatus, MultisigAccountManager } from '@/features/wallet';
import { TransactionBuilder } from '@/features/transaction';
import { SigningFlow } from '@/features/signing';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components';
import { cn } from '@/shared/lib/cn';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

type AppView = 'build' | 'sign' | 'history';

const guideContent: Record<AppView, { title: string; steps: string[] }> = {
  build: {
    title: 'Building a Transaction',
    steps: [
      'Create or select a multisig account (threshold + signers)',
      'Select notes (UTXOs) belonging to the multisig',
      'Add one or more recipients with amounts',
      'Review and build the unsigned transaction',
    ],
  },
  sign: {
    title: 'Signing Transactions',
    steps: [
      'View pending transactions or import from co-signers',
      'Sign with your key if you are an authorized signer',
      'Export and share with co-signers for more signatures',
      'Broadcast once threshold signatures are collected',
    ],
  },
  history: {
    title: 'Transaction History',
    steps: [
      'View all broadcasted transactions',
      'Check confirmation status on-chain',
      'See transaction details and signatures',
      'Track multisig activity over time',
    ],
  },
};

function QuickGuide({ view }: { view: AppView }) {
  const { title, steps } = guideContent[view];

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <svg className="h-4 w-4 text-accent icon-rotate" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol key={view} className="space-y-3 text-sm animate-stagger">
          {steps.map((step, index) => (
            <li key={index} className="flex gap-3">
              <span className="flex-shrink-0 h-6 w-6 rounded-full bg-tertiary text-accent text-xs font-medium flex items-center justify-center">
                {index + 1}
              </span>
              <span className="text-secondary">{step}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function AppContent() {
  const [view, setView] = useState<AppView>('build');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleBuildComplete = () => {
    setView('sign');
  };

  const handleNavClick = (newView: AppView) => {
    setView(newView);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-9 sm:w-9 bg-[var(--color-accent)] flex items-center justify-center rounded-lg">
                <span className="text-[var(--color-bg)] font-bold text-sm sm:text-base">N</span>
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-semibold tracking-tight">Nockchain</h1>
                <p className="text-[10px] sm:text-xs text-muted -mt-0.5">Multisig</p>
              </div>
            </div>

            <div className="hidden md:block h-6 w-px bg-[var(--color-border)] mx-2" />

            <nav className="hidden md:flex items-center p-1 bg-[var(--color-bg-tertiary)] rounded-xl">
              <button
                onClick={() => setView('build')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  view === 'build'
                    ? 'bg-[var(--color-accent)] text-[var(--color-bg)] shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-elevated)]'
                )}
              >
                <Hammer className="h-4 w-4" />
                Build
              </button>
              <button
                onClick={() => setView('sign')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  view === 'sign'
                    ? 'bg-[var(--color-accent)] text-[var(--color-bg)] shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-elevated)]'
                )}
              >
                <PenTool className="h-4 w-4" />
                Sign
              </button>
              <button
                onClick={() => setView('history')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  view === 'history'
                    ? 'bg-[var(--color-accent)] text-[var(--color-bg)] shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-elevated)]'
                )}
              >
                <Clock className="h-4 w-4" />
                History
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <ConnectWalletButton />
            <button
              className="md:hidden p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-[var(--color-border)] bg-[var(--color-bg)] animate-fade-in">
            <div className="px-3 py-3 space-y-1">
              <button
                onClick={() => handleNavClick('build')}
                className={cn(
                  'flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left font-medium transition-all duration-200',
                  view === 'build'
                    ? 'bg-[var(--color-accent)] text-[var(--color-bg)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]'
                )}
              >
                <Hammer className="h-5 w-5" />
                Build Transaction
              </button>
              <button
                onClick={() => handleNavClick('sign')}
                className={cn(
                  'flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left font-medium transition-all duration-200',
                  view === 'sign'
                    ? 'bg-[var(--color-accent)] text-[var(--color-bg)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]'
                )}
              >
                <PenTool className="h-5 w-5" />
                Sign Transaction
              </button>
              <button
                onClick={() => handleNavClick('history')}
                className={cn(
                  'flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left font-medium transition-all duration-200',
                  view === 'history'
                    ? 'bg-[var(--color-accent)] text-[var(--color-bg)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]'
                )}
              >
                <Clock className="h-5 w-5" />
                History
              </button>
            </div>
          </nav>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            {view === 'build' && (
              <Card key="build" className="card-elevated page-transition">
                <CardHeader className="border-b border-[var(--color-border)]">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Create Multisig Transaction</CardTitle>
                    <span className="badge badge-accent">Draft</span>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <TransactionBuilder onBuildComplete={handleBuildComplete} />
                </CardContent>
              </Card>
            )}

            {view === 'sign' && (
              <Card key="sign" className="card-elevated page-transition">
                <CardHeader className="border-b border-[var(--color-border)]">
                  <CardTitle className="text-lg">Sign Transaction</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <SigningFlow />
                </CardContent>
              </Card>
            )}

            {view === 'history' && (
              <Card key="history" className="card-elevated page-transition">
                <CardHeader className="border-b border-[var(--color-border)]">
                  <CardTitle className="text-lg">Transaction History</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                    <div className="h-16 w-16 bg-tertiary flex items-center justify-center mb-4 rounded-2xl">
                      <svg className="h-8 w-8 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-secondary font-medium">No transaction history</p>
                    <p className="text-sm text-muted mt-1 max-w-xs">
                      Your completed transactions will appear here
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-4 space-y-6">
            <WalletStatus />

            <MultisigAccountManager />

            <QuickGuide view={view} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
