import {
  FileText,
  ArrowRight,
  Shield,
  Coins,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components";
import { Nicks } from "@/shared/types";
import { useTransactionBuilder } from "@/shared/hooks/use-transaction-builder";

export function TransactionReview() {
  const {
    draft,
    selectedInputs,
    totalInputAmount,
    totalOutputAmount,
    estimatedFee,
    remainingBalance,
  } = useTransactionBuilder();

  const { threshold, signers } = draft.multisigConfig;

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-accent icon-rotate" />
          Transaction Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6 animate-stagger">
          <div className="p-4 rounded-xl bg-tertiary space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Coins className="h-4 w-4 text-accent" />
              Inputs ({selectedInputs.length})
            </div>
            <div className="space-y-2 pl-6">
              {selectedInputs.map((input, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="font-mono text-secondary truncate max-w-[200px]">
                    {input.nameLast.slice(0, 16)}...
                  </span>
                  <span className="font-mono">
                    {Nicks.toNock(Nicks.fromBigInt(input.assets)).toLocaleString()} NOCK
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowRight className="h-5 w-5 text-muted" />
          </div>

          <div className="p-4 rounded-xl bg-tertiary space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ArrowRight className="h-4 w-4 text-accent" />
              Outputs ({draft.outputs.length})
            </div>
            <div className="space-y-2 pl-6">
              {draft.outputs.map((output, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="font-mono text-secondary truncate max-w-[200px]">
                    {output.recipientAddress.slice(0, 16)}...
                  </span>
                  <span className="font-mono">
                    {Nicks.toNock(output.amount).toLocaleString()} NOCK
                  </span>
                </div>
              ))}
              {remainingBalance > 0n && (
                <div className="flex justify-between text-sm text-muted">
                  <span>Refund (to self)</span>
                  <span className="font-mono">
                    {Nicks.toNock(remainingBalance).toLocaleString()} NOCK
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-tertiary space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Shield className="h-4 w-4 text-accent" />
              Multisig Configuration
            </div>
            <div className="pl-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-secondary">Threshold</span>
                <span className="font-mono">
                  {threshold} of {signers.length}
                </span>
              </div>
              <div className="text-sm text-secondary">
                <span>Signers:</span>
                <ul className="mt-1 space-y-1">
                  {signers.map((signer, i) => (
                    <li key={i} className="font-mono text-xs pl-2">
                      {signer.label || `Signer ${i + 1}`}:{" "}
                      <span className="text-muted">
                        {signer.publicKeyHash.slice(0, 12)}...
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[var(--color-border)] space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-secondary">Total Input</span>
              <span className="font-mono">
                {Nicks.toNock(totalInputAmount).toLocaleString()} NOCK
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-secondary">Total Output</span>
              <span className="font-mono">
                {Nicks.toNock(totalOutputAmount).toLocaleString()} NOCK
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-secondary">Network Fee</span>
              <span className="font-mono text-muted">
                {Nicks.toNock(estimatedFee).toLocaleString()} NOCK
              </span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-[var(--color-border-subtle)]">
              <span className="font-medium">Refund</span>
              <span className="font-mono text-accent animate-count">
                {Nicks.toNock(remainingBalance).toLocaleString()} NOCK
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-xl bg-[var(--color-warning)]/10 text-[var(--color-warning)]">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p className="text-sm">
              This transaction requires {threshold} signature
              {threshold > 1 ? "s" : ""} from the configured signers before it
              can be broadcast.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
