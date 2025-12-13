import { Check, Clock, User } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

interface SignerStatus {
  id: string;
  publicKeyHash: string;
  label: string;
  hasSigned: boolean;
  signedAt: number | null;
  isCurrentUser: boolean;
}

interface SignatureProgressProps {
  signed: number;
  required: number;
  total: number;
  signers: SignerStatus[];
  compact?: boolean;
}

export function SignatureProgress({
  signed,
  required,
  signers,
  compact = false,
}: SignatureProgressProps) {
  const progress = Math.min((signed / required) * 100, 100);
  const isComplete = signed >= required;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex -space-x-1">
          {signers.slice(0, 3).map((signer) => (
            <div
              key={signer.id}
              className={cn(
                'h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium border-2 border-[var(--color-bg)]',
                signer.hasSigned
                  ? 'bg-[var(--color-success)] text-white'
                  : 'bg-tertiary text-muted'
              )}
            >
              {signer.hasSigned ? (
                <Check className="h-3 w-3" />
              ) : (
                signer.label.charAt(0).toUpperCase()
              )}
            </div>
          ))}
          {signers.length > 3 && (
            <div className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium bg-tertiary text-muted border-2 border-[var(--color-bg)]">
              +{signers.length - 3}
            </div>
          )}
        </div>
        <span className="text-sm font-medium">
          {signed}/{required}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-secondary">Signature Progress</span>
          <span className={cn('font-medium', isComplete && 'text-[var(--color-success)]')}>
            {signed} of {required} required
          </span>
        </div>
        <div className="h-2 bg-tertiary rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-300',
              isComplete ? 'bg-[var(--color-success)]' : 'bg-[var(--color-accent)]'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {signers.map((signer) => (
          <div
            key={signer.id}
            className={cn(
              'flex items-center justify-between p-3 rounded-xl transition-all duration-200',
              signer.isCurrentUser ? 'bg-[var(--color-accent)]/10' : 'bg-tertiary hover:bg-elevated'
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center transition-transform duration-200',
                  signer.hasSigned
                    ? 'bg-[var(--color-success)] text-white scale-105'
                    : 'bg-[var(--color-bg)] text-muted'
                )}
              >
                {signer.hasSigned ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{signer.label}</span>
                  {signer.isCurrentUser && (
                    <span className="text-xs px-1.5 py-0.5 rounded-md bg-[var(--color-accent)] text-[var(--color-bg)]">
                      You
                    </span>
                  )}
                </div>
                <span className="text-xs font-mono text-muted">
                  {signer.publicKeyHash.slice(0, 8)}...{signer.publicKeyHash.slice(-6)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {signer.hasSigned ? (
                <div className="flex items-center gap-1 text-[var(--color-success)]">
                  <Check className="h-4 w-4" />
                  <span className="text-sm">Signed</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-muted">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Pending</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
