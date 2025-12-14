import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  PenTool,
  Radio,
  Send,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Button, Card, CardContent, CardHeader } from "@/shared/components";
import { cn } from "@/shared/lib/cn";
import { Nicks, type PendingTransaction } from "@/shared/types";
import { SignatureProgress } from "./signature-progress";
import type { BroadcastState } from "./use-signing";

interface SignerStatus {
  id: string;
  publicKeyHash: string;
  label: string;
  hasSigned: boolean;
  signedAt: number | null;
  isCurrentUser: boolean;
}

interface PendingTransactionCardProps {
  transaction: PendingTransaction;
  signatureProgress: { signed: number; required: number; total: number };
  signerStatus: SignerStatus[];
  canSign: boolean;
  isSigning?: boolean;
  isBroadcasting?: boolean;
  broadcastState?: BroadcastState;
  onSign: () => void;
  onRemove: () => void;
  onExport: () => string;
  onBroadcast?: () => void;
}

export function PendingTransactionCard({
  transaction,
  signatureProgress,
  signerStatus,
  canSign,
  isSigning = false,
  isBroadcasting = false,
  broadcastState,
  onSign,
  onRemove,
  onExport,
  onBroadcast,
}: PendingTransactionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const { signed, required } = signatureProgress;
  const isReady = signed >= required;
  const isBroadcast = transaction.status === "broadcast";
  const createdDate = new Date(transaction.createdAt);

  const isThisTxBroadcasting = broadcastState?.txId === transaction.id;
  const currentBroadcastStatus = isThisTxBroadcasting
    ? broadcastState?.status
    : null;

  const handleCopyExport = async () => {
    try {
      const exportData = onExport();
      await navigator.clipboard.writeText(exportData);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const exportData = onExport();
      const textArea = document.createElement("textarea");
      textArea.value = exportData;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadExport = () => {
    const exportData = onExport();
    const blob = new Blob([exportData], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tx-${transaction.id.slice(0, 8)}.nock`;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusDisplay = () => {
    if (isBroadcast) {
      return {
        icon: <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />,
        text: "Broadcast",
        className: "border-[var(--color-success)]/50",
      };
    }
    if (isReady) {
      return {
        icon: <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />,
        text: "Ready to Broadcast",
        className: "border-[var(--color-success)]/50",
      };
    }
    return {
      icon: <Clock className="h-4 w-4 text-[var(--color-warning)]" />,
      text: "Awaiting Signatures",
      className: "",
    };
  };

  const status = getStatusDisplay();

  return (
    <Card
      className={cn(
        "transition-all duration-300 card-interactive animate-fade-in",
        status.className,
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {status.icon}
              <span className="font-medium">{status.text}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted">
              <span className="font-mono">
                {transaction.id.slice(0, 12)}...
              </span>
              <span>•</span>
              <span>{createdDate.toLocaleDateString()}</span>
              <span>{createdDate.toLocaleTimeString()}</span>
            </div>
          </div>

          <SignatureProgress
            signed={signed}
            required={required}
            total={signatureProgress.total}
            signers={signerStatus}
            compact
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 p-3 bg-tertiary rounded-xl text-sm">
          <div>
            <span className="text-muted block">Inputs</span>
            <span className="font-mono font-medium">
              {transaction.selectedInputs.length} notes
            </span>
          </div>
          <div>
            <span className="text-muted block">Outputs</span>
            <span className="font-mono font-medium">
              {transaction.draft.outputs.length} recipients
            </span>
          </div>
          <div>
            <span className="text-muted block">Amount</span>
            <span className="font-mono font-medium">
              {Nicks.toNock(transaction.totalOutputAmount).toLocaleString()}{" "}
              NOCK
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canSign && !isReady && !isBroadcast && (
            <Button
              variant="primary"
              onClick={onSign}
              disabled={isSigning}
              className="flex-1 gap-2"
            >
              {isSigning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing...
                </>
              ) : (
                <>
                  <PenTool className="h-4 w-4" />
                  Sign Transaction
                </>
              )}
            </Button>
          )}

          {isReady && !isBroadcast && (
            <Button
              variant="primary"
              onClick={onBroadcast}
              disabled={
                isBroadcasting ||
                currentBroadcastStatus === "simulating" ||
                currentBroadcastStatus === "broadcasting"
              }
              className="flex-1 gap-2"
            >
              {currentBroadcastStatus === "simulating" ? (
                <>
                  <ShieldCheck className="h-4 w-4 animate-pulse" />
                  Validating...
                </>
              ) : currentBroadcastStatus === "broadcasting" ? (
                <>
                  <Radio className="h-4 w-4 animate-pulse" />
                  Broadcasting...
                </>
              ) : isBroadcasting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Broadcast
                </>
              )}
            </Button>
          )}

          {isBroadcast && transaction.txHash && (
            <Button
              variant="secondary"
              className="flex-1 gap-2"
              onClick={() => {
                navigator.clipboard.writeText(
                  transaction.txHash || "nockchain",
                );
              }}
            >
              <ExternalLink className="h-4 w-4" />
              {transaction.txHash.slice(0, 8)}...
            </Button>
          )}

          <Button
            variant="secondary"
            size="icon"
            onClick={handleCopyExport}
            title="Copy to clipboard"
          >
            {copied ? (
              <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>

          <Button
            variant="secondary"
            size="icon"
            onClick={handleDownloadExport}
            title="Download"
          >
            <Download className="h-4 w-4" />
          </Button>

          <Button
            variant="secondary"
            size="icon"
            onClick={() => setExpanded(!expanded)}
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {isThisTxBroadcasting &&
          broadcastState?.message &&
          currentBroadcastStatus !== "idle" && (
            <div
              className={cn(
                "p-3 rounded-lg text-sm animate-fade-in",
                currentBroadcastStatus === "error" &&
                  "bg-[var(--color-error)]/10 border border-[var(--color-error)]/30",
                currentBroadcastStatus === "success" &&
                  "bg-[var(--color-success)]/10 border border-[var(--color-success)]/30",
                (currentBroadcastStatus === "simulating" ||
                  currentBroadcastStatus === "broadcasting") &&
                  "bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30",
              )}
            >
              <div className="flex items-start gap-2">
                {currentBroadcastStatus === "error" && (
                  <AlertTriangle className="h-4 w-4 text-[var(--color-error)] mt-0.5 flex-shrink-0" />
                )}
                {currentBroadcastStatus === "success" && (
                  <CheckCircle2 className="h-4 w-4 text-[var(--color-success)] mt-0.5 flex-shrink-0" />
                )}
                {(currentBroadcastStatus === "simulating" ||
                  currentBroadcastStatus === "broadcasting") && (
                  <Loader2 className="h-4 w-4 text-[var(--color-primary)] mt-0.5 flex-shrink-0 animate-spin" />
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "font-medium",
                      currentBroadcastStatus === "error" &&
                        "text-[var(--color-error)]",
                      currentBroadcastStatus === "success" &&
                        "text-[var(--color-success)]",
                    )}
                  >
                    {broadcastState.message}
                  </p>
                  {broadcastState.details && (
                    <p className="text-xs text-muted mt-1 font-mono break-all">
                      {broadcastState.details}
                    </p>
                  )}
                </div>
              </div>

              {broadcastState.warnings.length > 0 && (
                <div className="mt-2 pt-2 border-t border-[var(--color-border-subtle)]">
                  {broadcastState.warnings.map((warning, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs text-[var(--color-warning)]"
                    >
                      <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        {expanded && (
          <div className="space-y-4 pt-4 border-t border-[var(--color-border)] animate-fade-in">
            <SignatureProgress
              signed={signed}
              required={required}
              total={signatureProgress.total}
              signers={signerStatus}
            />

            <div className="space-y-3">
              <h4 className="text-sm font-medium">Transaction Details</h4>

              <div className="space-y-2">
                <div className="text-xs text-muted uppercase tracking-wide">
                  Inputs
                </div>
                {transaction.selectedInputs.map((input, i) => (
                  <div
                    key={i}
                    className="flex justify-between text-sm p-2 bg-tertiary rounded-lg"
                  >
                    <span className="font-mono text-secondary truncate max-w-[200px]">
                      {input.nameLast.slice(0, 16)}...
                    </span>
                    <span className="font-mono">
                      {Nicks.toNock(
                        Nicks.fromBigInt(input.assets),
                      ).toLocaleString()}{" "}
                      NOCK
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="text-xs text-muted uppercase tracking-wide">
                  Outputs
                </div>
                {transaction.draft.outputs.map((output) => (
                  <div
                    key={output.id}
                    className="flex justify-between text-sm p-2 bg-tertiary rounded-lg"
                  >
                    <span className="font-mono text-secondary truncate max-w-[200px]">
                      {output.recipientAddress.slice(0, 16)}...
                    </span>
                    <span className="font-mono">
                      {Nicks.toNock(output.amount).toLocaleString()} NOCK
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between text-sm pt-2 border-t border-[var(--color-border-subtle)]">
                <span className="text-muted">Network Fee</span>
                <span className="font-mono">
                  {Nicks.toNock(transaction.totalFee).toLocaleString()} NOCK
                </span>
              </div>
            </div>

            <div className="pt-2">
              <Button
                variant="secondary"
                onClick={onRemove}
                className="w-full gap-2 text-[var(--color-error)] hover:bg-[var(--color-error)]/10"
              >
                <Trash2 className="h-4 w-4" />
                Remove Transaction
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
