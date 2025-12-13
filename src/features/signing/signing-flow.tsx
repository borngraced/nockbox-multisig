import { useState } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/components';
import { useSigning } from './use-signing';
import { PendingTransactionCard } from './pending-transaction-card';
import { ImportTransactionModal } from './import-transaction-modal';

export function SigningFlow() {
  const [showImport, setShowImport] = useState(false);
  const {
    pendingTransactions,
    isConnected,
    signing,
    signError,
    broadcasting,
    broadcastError,
    broadcastState,
    getSignatureProgress,
    canCurrentUserSign,
    getSignerStatus,
    handleSign,
    handleRemove,
    handleBroadcast,
    exportTransaction,
  } = useSigning();

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
        <div className="h-14 w-14 bg-tertiary flex items-center justify-center mb-4 rounded-xl">
          <AlertCircle className="h-7 w-7 text-muted" />
        </div>
        <p className="text-secondary font-medium">Wallet not connected</p>
        <p className="text-sm text-muted mt-1">
          Connect your wallet to view and sign transactions
        </p>
      </div>
    );
  }

  if (pendingTransactions.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-14 w-14 bg-tertiary flex items-center justify-center mb-4 rounded-xl">
            <FileText className="h-7 w-7 text-muted" />
          </div>
          <p className="text-secondary font-medium">No pending transactions</p>
          <p className="text-sm text-muted mt-1 max-w-xs">
            Build a transaction first or import an existing one to sign
          </p>
          <Button
            variant="secondary"
            onClick={() => setShowImport(true)}
            className="mt-4 gap-2"
          >
            <Upload className="h-4 w-4" />
            Import Transaction
          </Button>
        </div>

        <ImportTransactionModal
          open={showImport}
          onClose={() => setShowImport(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Pending Transactions</h3>
          <p className="text-sm text-muted">
            {pendingTransactions.length} transaction{pendingTransactions.length !== 1 ? 's' : ''} awaiting action
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => setShowImport(true)}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          Import
        </Button>
      </div>

      {(broadcastError || signError) && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-[var(--color-error)]/10 text-[var(--color-error)] animate-fade-in">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{broadcastError || signError}</p>
        </div>
      )}

      <div className="space-y-4 animate-stagger">
        {pendingTransactions.map((tx) => (
          <PendingTransactionCard
            key={tx.id}
            transaction={tx}
            signatureProgress={getSignatureProgress(tx)}
            signerStatus={getSignerStatus(tx)}
            canSign={canCurrentUserSign(tx)}
            isSigning={signing === tx.id}
            isBroadcasting={broadcasting === tx.id}
            broadcastState={broadcastState}
            onSign={() => handleSign(tx.id)}
            onRemove={() => handleRemove(tx.id)}
            onExport={() => exportTransaction(tx)}
            onBroadcast={() => handleBroadcast(tx.id)}
          />
        ))}
      </div>

      <ImportTransactionModal
        open={showImport}
        onClose={() => setShowImport(false)}
      />
    </div>
  );
}
