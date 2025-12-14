import { Coins, Hash, Layers, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components';
import { useWallet } from './use-wallet';
import { Nicks } from '@/shared/types';

export function WalletStatus() {
  const { isConnected, connection, notes, formattedBalance, totalBalance } = useWallet();

  if (!isConnected || !connection) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Coins className="h-4 w-4 text-muted" />
            Wallet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 animate-fade-in">
            <div className="h-12 w-12 bg-tertiary flex items-center justify-center mx-auto mb-3 rounded-xl">
              <Coins className="h-6 w-6 text-muted" />
            </div>
            <p className="text-sm text-secondary">Not connected</p>
            <p className="text-xs text-muted mt-1">Connect wallet to view balance</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Coins className="h-4 w-4 text-accent icon-rotate" />
          Wallet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-gradient-to-br from-[var(--color-accent-glow)] to-transparent border border-[var(--color-accent-glow)] rounded-xl animate-scale-in">
          <p className="text-xs text-secondary mb-1">Total Balance</p>
          <p className="stat-value text-accent animate-count">{formattedBalance}</p>
          <p className="text-xs text-muted mt-1 font-mono">
            {totalBalance.toLocaleString()} nicks
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Address</span>
            <a
              href={`https://nockscan.app/address/${connection.pkh}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-secondary hover:text-accent transition-all duration-200 font-mono text-xs hover:scale-105"
            >
              {(connection.pkh as string).slice(0, 8)}...{(connection.pkh as string).slice(-6)}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {notes.length > 0 && (
          <div className="space-y-3 pt-3 border-t border-[var(--color-border)] animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-secondary">
                <Layers className="h-4 w-4" />
                <span>Available Notes</span>
              </div>
              <span className="badge">{notes.length}</span>
            </div>
            <div className="max-h-40 space-y-2 overflow-y-auto scrollbar-thin pr-1 animate-stagger">
              {notes.map((wn, i) => (
                <div
                  key={`${wn.display.nameFirst}-${wn.display.nameLast}-${i}`}
                  className="flex items-center justify-between p-3 bg-tertiary hover:bg-elevated transition-all duration-200 rounded-lg hover:scale-[1.01]"
                >
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-muted" />
                    <span className="font-mono text-xs text-secondary">
                      {wn.display.nameLast.slice(0, 10)}...
                    </span>
                  </div>
                  <span className="font-mono text-sm text-accent">
                    {Nicks.toNock(Nicks.fromBigInt(wn.display.assets)).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {notes.length === 0 && (
          <div className="text-center py-4 animate-fade-in">
            <p className="text-sm text-muted">No notes found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
