import { Plus, Trash2, Send } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "@/shared/components";
import { Nicks } from "@/shared/types";
import { useTransactionBuilder } from "@/shared/hooks/use-transaction-builder";

export function OutputForm() {
  const {
    draft,
    totalInputAmount,
    totalOutputAmount,
    estimatedFee,
    remainingBalance,
    addOutput,
    updateOutput,
    removeOutput,
  } = useTransactionBuilder();

  const handleAmountChange = (id: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const nicksValue = Nicks.fromNock(numValue);
    updateOutput(id, { amount: nicksValue });
  };

  const isOverspending = remainingBalance < 0n;

  return (
    <Card className="animate-fade-in">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Send className="h-4 w-4 text-accent icon-rotate" />
          Transaction Outputs
        </CardTitle>
        <Button
          variant="secondary"
          size="sm"
          onClick={addOutput}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          Add Output
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {draft.outputs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center rounded-xl border border-dashed border-[var(--color-border)] animate-fade-in">
              <Send className="h-10 w-10 text-muted mb-3" />
              <p className="text-secondary">No outputs added</p>
              <p className="text-sm text-muted mt-1">
                Add recipients for your transaction
              </p>
            </div>
          ) : (
            <div className="space-y-3 animate-stagger">
              {draft.outputs.map((output, index) => (
                <div
                  key={output.id}
                  className="p-4 rounded-xl bg-tertiary space-y-3 transition-all duration-200 hover:bg-elevated"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-secondary">
                      Output #{index + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOutput(output.id)}
                      className="h-8 w-8 text-muted hover:text-[var(--color-error)]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <Input
                    label="Recipient Address"
                    placeholder="Enter base58 address or public key hash"
                    value={output.recipientAddress}
                    onChange={(e) =>
                      updateOutput(output.id, {
                        recipientAddress: e.target.value,
                      })
                    }
                    className="font-mono text-sm"
                  />

                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <Input
                        label="Amount (NOCK)"
                        type="number"
                        placeholder="0.00"
                        value={Nicks.toNock(output.amount) || ""}
                        onChange={(e) =>
                          handleAmountChange(output.id, e.target.value)
                        }
                        className="font-mono"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mb-1 text-xs text-accent"
                      onClick={() => {
                        const maxAmount = remainingBalance + output.amount;
                        if (maxAmount > 0n) {
                          updateOutput(output.id, {
                            amount: maxAmount as Nicks,
                          });
                        }
                      }}
                    >
                      MAX
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-4 border-t border-[var(--color-border)] space-y-2 animate-fade-in">
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
              <span className="text-secondary">Estimated Fee</span>
              <span className="font-mono text-muted">
                {Nicks.toNock(estimatedFee).toLocaleString()} NOCK
              </span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-[var(--color-border-subtle)]">
              <span className="text-secondary">Remaining (Refund)</span>
              <span
                className={`font-mono transition-colors duration-200 ${isOverspending ? "text-[var(--color-error)]" : "text-accent"}`}
              >
                {Nicks.toNock(remainingBalance).toLocaleString()} NOCK
              </span>
            </div>
            {isOverspending && (
              <p className="text-xs text-[var(--color-error)] animate-fade-in rounded-lg p-2 bg-[var(--color-error)]/10">
                Output amount exceeds available balance
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
