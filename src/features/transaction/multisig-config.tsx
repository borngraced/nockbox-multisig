import { Plus, Trash2, Users, Shield, AlertCircle } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "@/shared/components";
import { cn } from "@/shared/lib/cn";
import { useTransactionBuilder } from "@/shared/hooks/use-transaction-builder";
import { isValidPkh } from "./build-transaction";

export function MultisigConfig() {
  const { draft, addSigner, updateSigner, removeSigner, setThreshold } =
    useTransactionBuilder();

  const { threshold, signers } = draft.multisigConfig;
  const maxThreshold = signers.length || 1;

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-accent icon-rotate" />
          Multisig Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-tertiary">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-medium">Signature Threshold</p>
                <p className="text-sm text-secondary">
                  Minimum signatures required to spend
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setThreshold(Math.max(1, threshold - 1))}
                  disabled={threshold <= 1}
                >
                  -
                </Button>
                <span className="w-12 text-center font-mono text-lg text-accent">
                  {threshold}
                </span>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    setThreshold(Math.min(maxThreshold, threshold + 1))
                  }
                  disabled={threshold >= maxThreshold}
                >
                  +
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted" />
              <span className="text-secondary">
                {threshold} of {signers.length} signatures required
              </span>
            </div>

            <div className="mt-4 flex gap-1">
              {Array.from({ length: Math.max(signers.length, 1) }).map(
                (_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-2 flex-1 rounded-full transition-colors",
                      i < threshold
                        ? "bg-[var(--color-accent)]"
                        : "bg-[var(--color-border)]",
                    )}
                  />
                ),
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-medium">Signers ({signers.length})</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={addSigner}
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Signer
              </Button>
            </div>

            {signers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center bg-tertiary rounded-xl border border-dashed border-[var(--color-border)] animate-fade-in">
                <Users className="h-10 w-10 text-muted mb-3" />
                <p className="text-secondary">No signers added</p>
                <p className="text-sm text-muted mt-1">
                  Add at least one signer to create a multisig
                </p>
              </div>
            ) : (
              <div className="space-y-3 animate-stagger">
                {signers.map((signer, index) => (
                  <div
                    key={signer.id}
                    className="p-4 rounded-xl bg-tertiary space-y-3 transition-all duration-200 hover:bg-elevated"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-secondary">
                        Signer #{index + 1}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSigner(signer.id)}
                        className="h-8 w-8 text-muted hover:text-[var(--color-error)]"
                        disabled={signers.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <Input
                      label="Label (optional)"
                      placeholder="e.g., Alice, Treasury, etc."
                      value={signer.label}
                      onChange={(e) =>
                        updateSigner(signer.id, { label: e.target.value })
                      }
                    />

                    <div className="space-y-1">
                      <Input
                        label="Public Key Hash / Address"
                        placeholder="Hex PKH or base58 address"
                        value={signer.publicKeyHash}
                        onChange={(e) =>
                          updateSigner(signer.id, {
                            publicKeyHash: e.target.value,
                          })
                        }
                        className="font-mono text-sm"
                      />
                      {signer.publicKeyHash &&
                        !isValidPkh(signer.publicKeyHash) && (
                          <div className="flex items-center gap-1 text-xs text-[var(--color-error)]">
                            <AlertCircle className="h-4 w-4" />
                            Invalid format (use hex or base58)
                          </div>
                        )}
                      {signer.publicKeyHash &&
                        signers.some(
                          (s) =>
                            s.id !== signer.id &&
                            s.publicKeyHash.toLowerCase().trim() ===
                              signer.publicKeyHash.toLowerCase().trim()
                        ) && (
                          <div className="flex items-center gap-1 text-xs text-[var(--color-warning)]">
                            <AlertCircle className="h-4 w-4" />
                            Duplicate signer address
                          </div>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
