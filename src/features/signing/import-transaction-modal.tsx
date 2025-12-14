import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Upload, X, FileText, AlertCircle } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components";
import type { Nicks, PendingTransaction } from "@/shared/types";
import { useTransactionStore } from "@/shared/hooks/transaction-store";

interface ImportTransactionModalProps {
  open: boolean;
  onClose: () => void;
}

export function ImportTransactionModal({
  open,
  onClose,
}: ImportTransactionModalProps) {
  const [importData, setImportData] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { pendingTransactions } = useTransactionStore();

  const parseImportData = (data: string): PendingTransaction | null => {
    try {
      const decoded = atob(data.trim());
      const reviver = (_key: string, value: unknown): unknown => {
        if (value && typeof value === "object" && "__type" in value) {
          const obj = value as { __type: string; value: string };
          if (obj.__type === "bigint") {
            return BigInt(obj.value);
          }
        }
        return value;
      };

      const parsed = JSON.parse(decoded, reviver);

      if (!parsed.version || !parsed.transaction) {
        throw new Error("Invalid transaction format");
      }

      if (parsed.version !== 1) {
        throw new Error(`Unsupported transaction version: ${parsed.version}`);
      }

      const tx = parsed.transaction;

      if (pendingTransactions.some((p) => p.id === tx.id)) {
        throw new Error("This transaction has already been imported");
      }

      const draft = {
        ...tx.draft,
        inputs: tx.draft.inputs.map(
          (input: {
            note: {
              name: { first: string; last: string };
              assets: string;
              originPage: string;
            };
            selected: boolean;
          }) => ({
            nameFirst: input.note.name.first,
            nameLast: input.note.name.last,
            assets: BigInt(input.note.assets),
            originPage: BigInt(input.note.originPage),
            selected: input.selected,
          }),
        ),
        outputs: tx.draft.outputs.map(
          (output: {
            id: string;
            recipientAddress: string;
            amount: string;
          }) => ({
            ...output,
            amount: BigInt(output.amount) as Nicks,
          }),
        ),
        feePerWord: BigInt(tx.draft.feePerWord) as Nicks,
      };

      const selectedInputs = tx.selectedInputs.map(
        (input: {
          note: {
            name: { first: string; last: string };
            assets: string;
            originPage: string;
          };
          selected: boolean;
        }) => ({
          nameFirst: input.note.name.first,
          nameLast: input.note.name.last,
          assets: BigInt(input.note.assets),
          originPage: BigInt(input.note.originPage),
          selected: input.selected,
        }),
      );

      if (!tx.rawTxJam) {
        throw new Error("Transaction data is missing rawTxJam");
      }

      const result: PendingTransaction = {
        id: tx.id,
        createdAt: tx.createdAt,
        draft,
        selectedInputs,
        totalInputAmount: BigInt(tx.totalInputAmount) as Nicks,
        totalOutputAmount: BigInt(tx.totalOutputAmount) as Nicks,
        totalFee: BigInt(tx.totalFee) as Nicks,
        signatures: tx.signatures.map(
          (s: {
            signerId: string;
            signature: number[] | null;
            signedAt: number | null;
          }) => ({
            ...s,
            signature: s.signature ? new Uint8Array(s.signature) : null,
          }),
        ),
        status: tx.status,
        txHash: tx.txHash,
        rawTxJam: new Uint8Array(tx.rawTxJam),
        noteProtobufs: tx.noteProtobufs
          ? tx.noteProtobufs.map((p: number[]) => new Uint8Array(p))
          : [],
        spendConditionProtobufs: tx.spendConditionProtobufs
          ? tx.spendConditionProtobufs.map((p: number[]) => new Uint8Array(p))
          : [],
      };

      if (tx.signedTx) {
        result.signedTx = new Uint8Array(tx.signedTx);
      }

      return result;
    } catch (e) {
      if (e instanceof Error) {
        throw e;
      }
      throw new Error("Failed to parse transaction data");
    }
  };

  const handleImport = () => {
    setError(null);

    if (!importData.trim()) {
      setError("Please enter or paste transaction data");
      return;
    }

    try {
      const tx = parseImportData(importData);
      if (!tx) {
        setError("Invalid transaction data");
        return;
      }

      useTransactionStore.setState((state) => ({
        pendingTransactions: [...state.pendingTransactions, tx],
      }));

      setImportData("");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to import transaction");
    }
  };

  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportData(content);
      setError(null);
    };
    reader.onerror = () => {
      setError("Failed to read file");
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <Card className="relative z-[101] w-full max-w-lg max-h-[90vh] overflow-auto animate-scale-in">
        <CardHeader className="flex flex-row items-center justify-between border-b border-[var(--color-border)]">
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="h-5 w-5 text-accent icon-rotate" />
            Import Transaction
          </CardTitle>
          <Button variant="secondary" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="pt-6 space-y-4">
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
              dragOver
                ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5 scale-[1.01]"
                : "border-[var(--color-border)]"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <FileText className="h-10 w-10 mx-auto text-muted mb-3" />
            <p className="text-sm text-secondary mb-2">
              Drag and drop a .nock file here
            </p>
            <p className="text-xs text-muted mb-4">or</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".nock,.txt"
              className="hidden"
              onChange={handleFileInputChange}
            />
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              Browse Files
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--color-border)]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-[var(--color-card)] text-muted">
                or paste data directly
              </span>
            </div>
          </div>

          <textarea
            value={importData}
            onChange={(e) => {
              setImportData(e.target.value);
              setError(null);
            }}
            placeholder="Paste transaction data here..."
            className="w-full h-32 px-3 py-2 bg-tertiary border border-[var(--color-border)] rounded-xl text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all duration-200"
          />

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-[var(--color-error)]/10 text-[var(--color-error)] animate-fade-in">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleImport}
              className="flex-1"
              disabled={!importData.trim()}
            >
              Import
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>,
    document.body,
  );
}
