import { Check, Square, CheckSquare, Coins, Info } from 'lucide-react';
import { Button } from '@/shared/components';
import { cn } from '@/shared/lib/cn';
import { Nicks } from '@/shared/types';
import { useTransactionBuilder } from '@/shared/hooks/use-transaction-builder';

export function InputSelector() {
  const {
    draft,
    selectedInputs,
    totalInputAmount,
    isConnected,
    toggleNoteSelection,
    selectAllNotes,
    deselectAllNotes,
  } = useTransactionBuilder();

  const hasNotes = draft.inputs.length > 0;
  const allSelected = draft.inputs.length > 0 && draft.inputs.every((i) => i.selected);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Select Notes to Spend</h3>
          <p className="text-sm text-muted mt-0.5">
            Choose which UTXOs to include in this transaction
          </p>
        </div>
        {hasNotes && (
          <Button
            variant="ghost"
            size="sm"
            onClick={allSelected ? deselectAllNotes : selectAllNotes}
            className="text-xs"
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </Button>
        )}
      </div>

      {!hasNotes ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-[var(--color-border)] rounded-xl animate-fade-in">
          <div className="h-14 w-14 bg-tertiary flex items-center justify-center mb-4 rounded-xl">
            <Coins className="h-6 w-6 text-muted" />
          </div>
          <p className="text-secondary font-medium">
            {isConnected ? 'No balance' : 'No notes available'}
          </p>
          <p className="text-sm text-muted mt-1 max-w-xs">
            {isConnected
              ? 'This wallet has no spendable notes. Try a different account or fund this wallet first.'
              : 'Connect your wallet to see available notes'}
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto overflow-x-visible scrollbar-thin p-1 animate-stagger">
          {draft.inputs.map((input, index) => (
            <button
              key={`${input.nameFirst}-${input.nameLast}-${index}`}
              type="button"
              onClick={() => toggleNoteSelection(index)}
              className={cn(
                'w-full flex items-center justify-between p-4 rounded-xl',
                'bg-tertiary hover:bg-elevated',
                'border transition-all duration-200',
                input.selected
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent-glow)] scale-[1.01]'
                  : 'border-transparent hover:border-[var(--color-border-hover)] hover:scale-[1.005]'
              )}
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    'transition-transform duration-200',
                    input.selected && 'scale-110'
                  )}
                >
                  {input.selected ? (
                    <CheckSquare className="h-5 w-5 text-accent flex-shrink-0" />
                  ) : (
                    <Square className="h-5 w-5 text-muted flex-shrink-0" />
                  )}
                </div>
                <div className="text-left">
                  <p className="font-mono text-sm">{input.nameLast.slice(0, 16)}...</p>
                  <p className="text-xs text-muted mt-0.5">
                    Page #{input.originPage.toString()}
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  'font-mono font-medium transition-colors duration-200',
                  input.selected ? 'text-accent' : 'text-secondary'
                )}
              >
                {Nicks.toNock(Nicks.fromBigInt(input.assets)).toLocaleString()} NOCK
              </span>
            </button>
          ))}
        </div>
      )}

      {hasNotes && (
        <div className="flex items-center justify-between p-4 bg-tertiary border border-[var(--color-border)] rounded-xl animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-[var(--color-accent-glow)] flex items-center justify-center rounded-lg">
              <Check className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-secondary">
                {selectedInputs.length} of {draft.inputs.length} notes selected
              </p>
              <p className="text-xs text-muted">Total value to spend</p>
            </div>
          </div>
          <div className="text-right">
            <p className="stat-value text-accent animate-count">
              {Nicks.toNock(totalInputAmount).toLocaleString()}
            </p>
            <p className="text-xs text-muted">NOCK</p>
          </div>
        </div>
      )}

      {selectedInputs.length === 0 && hasNotes && (
        <div className="flex items-center gap-2 p-3 bg-[var(--color-warning)]/10 text-[var(--color-warning)] rounded-lg animate-fade-in">
          <Info className="h-4 w-4 flex-shrink-0" />
          <p className="text-sm">Select at least one note to continue</p>
        </div>
      )}
    </div>
  );
}
