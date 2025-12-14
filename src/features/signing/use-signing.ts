import { useCallback, useState } from "react";
import { wasm } from "@/shared/lib/wasm";
import { useWallet, getWalletService, useWalletStore } from "@/features/wallet";
import { useTransactionStore } from "@/shared/hooks/transaction-store";
import {
  simulateTransaction,
  parseWasmError,
} from "@/features/transaction/build-transaction";
import type { PendingTransaction } from "@/shared/types/types";

export type BroadcastStatus =
  | "idle"
  | "simulating"
  | "broadcasting"
  | "success"
  | "error";

export interface BroadcastState {
  txId: string | null;
  status: BroadcastStatus;
  message: string | null;
  details: string | null;
  warnings: string[];
}

export function useSigning() {
  const [broadcastState, setBroadcastState] = useState<BroadcastState>({
    txId: null,
    status: "idle",
    message: null,
    details: null,
    warnings: [],
  });
  const [signing, setSigning] = useState<string | null>(null);
  const [signError, setSignError] = useState<string | null>(null);

  const broadcasting =
    broadcastState.status === "broadcasting" ||
    broadcastState.status === "simulating"
      ? broadcastState.txId
      : null;
  const broadcastError =
    broadcastState.status === "error" ? broadcastState.message : null;

  const {
    pendingTransactions,
    addSignature,
    updateSignedTx,
    broadcastTransaction,
    removePendingTransaction,
  } = useTransactionStore();

  const { connection, isConnected } = useWallet();

  const getSignatureProgress = useCallback((tx: PendingTransaction) => {
    const signed = tx.signatures.filter((s) => s.signature !== null).length;
    const required = tx.draft.multisigConfig.threshold;
    const total = tx.draft.multisigConfig.signers.length;
    return { signed, required, total };
  }, []);

  const canCurrentUserSign = useCallback(
    (tx: PendingTransaction) => {
      if (!connection?.pkh) return false;

      const userPkh = connection.pkh;
      const signers = tx.draft.multisigConfig.signers;
      const signatures = tx.signatures;

      const signerIndex = signers.findIndex(
        (s) => s.publicKeyHash.toLowerCase() === userPkh.toLowerCase(),
      );

      if (signerIndex === -1) return false;

      const signer = signers[signerIndex];
      const signatureRecord = signatures.find((s) => s.signerId === signer?.id);

      return signatureRecord?.signature === null;
    },
    [connection?.pkh],
  );

  const getSignerStatus = useCallback(
    (tx: PendingTransaction) => {
      return tx.draft.multisigConfig.signers.map((signer) => {
        const signatureRecord = tx.signatures.find(
          (s) => s.signerId === signer.id,
        );
        return {
          ...signer,
          hasSigned: signatureRecord?.signature !== null,
          signedAt: signatureRecord?.signedAt ?? null,
          isCurrentUser:
            connection?.pkh?.toLowerCase() ===
            signer.publicKeyHash.toLowerCase(),
        };
      });
    },
    [connection?.pkh],
  );

  const handleSign = useCallback(
    async (txId: string) => {
      setSignError(null);

      if (!connection?.pkh) {
        setSignError("Wallet not connected");
        return;
      }

      const tx = pendingTransactions.find((t) => t.id === txId);
      if (!tx) {
        setSignError("Transaction not found");
        return;
      }

      if (!tx.rawTxJam) {
        setSignError("Transaction is missing required data for signing");
        return;
      }

      const signer = tx.draft.multisigConfig.signers.find(
        (s) => s.publicKeyHash.toLowerCase() === connection.pkh.toLowerCase(),
      );

      if (!signer) {
        setSignError("Your wallet is not a signer for this transaction");
        return;
      }

      setSigning(txId);

      try {
        const isTestMode = useWalletStore.getState().isTestMode;

        if (isTestMode) {
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const simulatedSignature = new Uint8Array(64);
          crypto.getRandomValues(simulatedSignature);

          addSignature(txId, signer.id, simulatedSignature);

          const signedTx = new Uint8Array(tx.rawTxJam.length + 64);
          signedTx.set(tx.rawTxJam, 0);
          signedTx.set(simulatedSignature, tx.rawTxJam.length);
          updateSignedTx(txId, signedTx);
        } else {
          if (!tx.noteProtobufs || tx.noteProtobufs.length === 0) {
            setSignError(
              "Transaction is missing note data required for signing. Please re-export from the original creator.",
            );
            setSigning(null);
            return;
          }

          const walletService = getWalletService();
          const nockchainTx = wasm.NockchainTx.fromJam(tx.rawTxJam);
          const rawTx = nockchainTx.toRawTx();

          const notes = tx.noteProtobufs.map((p) => wasm.Note.fromProtobuf(p));
          const spendConditions = tx.spendConditionProtobufs.map((p) =>
            wasm.SpendCondition.fromProtobuf(p),
          );

          const result = await walletService.signTransaction(rawTx, {
            notes,
            spendConditions,
          });

          if (result.ok) {
            addSignature(txId, signer.id, result.value);
            updateSignedTx(txId, result.value);
          } else {
            setSignError(result.error.message);
          }
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Signing failed";
        setSignError(message);
      } finally {
        setSigning(null);
      }
    },
    [connection?.pkh, pendingTransactions, addSignature, updateSignedTx],
  );

  const handleRemove = useCallback(
    (txId: string) => {
      removePendingTransaction(txId);
    },
    [removePendingTransaction],
  );

  const exportTransaction = useCallback((tx: PendingTransaction): string => {
    try {
      const exportData = {
        version: 1,
        transaction: {
          id: tx.id,
          createdAt: tx.createdAt,
          draft: {
            inputs: tx.draft.inputs.map((input) => ({
              note: {
                name: { first: input.nameFirst, last: input.nameLast },
                assets: input.assets.toString(),
                originPage: input.originPage.toString(),
              },
              selected: input.selected,
            })),
            outputs: tx.draft.outputs.map((output) => ({
              ...output,
              amount: output.amount.toString(),
            })),
            multisigConfig: tx.draft.multisigConfig,
            feePerWord: tx.draft.feePerWord.toString(),
          },
          selectedInputs: tx.selectedInputs.map((input) => ({
            note: {
              name: { first: input.nameFirst, last: input.nameLast },
              assets: input.assets.toString(),
              originPage: input.originPage.toString(),
            },
            selected: input.selected,
          })),
          totalInputAmount: tx.totalInputAmount.toString(),
          totalOutputAmount: tx.totalOutputAmount.toString(),
          totalFee: tx.totalFee.toString(),
          signatures: tx.signatures.map((s) => ({
            signerId: s.signerId,
            signature: s.signature ? Array.from(s.signature) : null,
            signedAt: s.signedAt,
          })),
          status: tx.status,
          txHash: tx.txHash,
          rawTxJam: Array.from(tx.rawTxJam),
          signedTx: tx.signedTx ? Array.from(tx.signedTx) : null,
          // noteProtobufs and spendConditionProtobufs are included because
          // co-signers don't have the original notes in their wallet.
          // They need these protobufs to sign the transaction.
          noteProtobufs: tx.noteProtobufs.map((p) => Array.from(p)),
          spendConditionProtobufs: tx.spendConditionProtobufs.map((p) =>
            Array.from(p),
          ),
        },
      };

      const jsonString = JSON.stringify(exportData);
      return btoa(jsonString);
    } catch {
      return "";
    }
  }, []);

  const handleBroadcast = useCallback(
    async (txId: string) => {
      const tx = pendingTransactions.find((t) => t.id === txId);
      if (!tx) {
        setBroadcastState({
          txId,
          status: "error",
          message: "Transaction not found",
          details: null,
          warnings: [],
        });
        return;
      }

      if (tx.status !== "ready") {
        setBroadcastState({
          txId,
          status: "error",
          message: "Transaction is not ready for broadcast",
          details: "More signatures are needed before broadcasting",
          warnings: [],
        });
        return;
      }

      if (!tx.signedTx && !tx.rawTxJam) {
        setBroadcastState({
          txId,
          status: "error",
          message: "No transaction data to broadcast",
          details: null,
          warnings: [],
        });
        return;
      }

      const isTestMode = useWalletStore.getState().isTestMode;

      // Step 1: Simulate transaction
      setBroadcastState({
        txId,
        status: "simulating",
        message: isTestMode
          ? "Validating transaction (Test Mode)..."
          : "Validating transaction...",
        details: null,
        warnings: [],
      });

      try {
        const simulationResult = await simulateTransaction(tx, isTestMode);

        if (!simulationResult.ok) {
          setBroadcastState({
            txId,
            status: "error",
            message: simulationResult.error.message,
            details: simulationResult.error.details ?? null,
            warnings: [],
          });
          return;
        }

        const { warnings } = simulationResult.value;

        setBroadcastState({
          txId,
          status: "broadcasting",
          message: isTestMode
            ? "Simulating broadcast..."
            : "Broadcasting to network...",
          details: null,
          warnings,
        });

        if (isTestMode) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const mockTxHash = `test_${tx.id.slice(0, 8)}_${Date.now().toString(16)}`;

          broadcastTransaction(txId, mockTxHash);
          setBroadcastState({
            txId,
            status: "success",
            message: "Transaction broadcast successfully (Test Mode)",
            details: mockTxHash,
            warnings: [
              ...warnings,
              "This is a simulated broadcast - no actual transaction was sent to the network",
            ],
          });
          return;
        }

        const walletService = getWalletService();
        const txToSend = tx.signedTx || tx.rawTxJam;

        if (!txToSend) {
          setBroadcastState({
            txId,
            status: "error",
            message: "Failed to prepare transaction for broadcast",
            details: null,
            warnings,
          });
          return;
        }

        const result = await walletService.broadcastTransaction(txToSend);

        if (result.ok) {
          broadcastTransaction(txId, result.value);
          setBroadcastState({
            txId,
            status: "success",
            message: "Transaction broadcast successfully",
            details: result.value,
            warnings,
          });
        } else {
          const { message, details } = parseWasmError(
            new Error(result.error.message),
          );
          setBroadcastState({
            txId,
            status: "error",
            message,
            details,
            warnings,
          });
        }
      } catch (error) {
        const { message, details } = parseWasmError(error);
        setBroadcastState({
          txId,
          status: "error",
          message,
          details,
          warnings: [],
        });
      }
    },
    [pendingTransactions, broadcastTransaction],
  );

  const clearBroadcastState = useCallback(() => {
    setBroadcastState({
      txId: null,
      status: "idle",
      message: null,
      details: null,
      warnings: [],
    });
  }, []);

  return {
    pendingTransactions,
    isConnected,
    signing,
    signError,
    broadcasting,
    broadcastError,
    broadcastState,
    clearBroadcastState,
    getSignatureProgress,
    canCurrentUserSign,
    getSignerStatus,
    handleSign,
    handleRemove,
    handleBroadcast,
    exportTransaction,
  };
}
