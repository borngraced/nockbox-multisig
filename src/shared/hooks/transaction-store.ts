import { create } from "zustand";
import type { Nicks } from "@/shared/types";
import {
  type WalletNote,
  toTransactionInput,
  useWalletStore,
} from "@/features/wallet/wallet-store";
import {
  type TransactionBuilderStep,
  type TransactionDraft,
  type TransactionOutput,
  type TransactionInput,
  type SignerConfig,
  type PendingTransaction,
  createEmptyDraft,
  generateOutputId,
  generateSignerId,
  generateTransactionId,
} from "../types/types";
import {
  buildTransaction as buildTx,
  type TransactionBuildError,
} from "../../features/transaction/build-transaction";

interface TransactionStore {
  step: TransactionBuilderStep;
  draft: TransactionDraft;
  pendingTransactions: PendingTransaction[];
  error: string | null;
  buildError: TransactionBuildError | null;
  isBuilding: boolean;

  setStep: (step: TransactionBuilderStep) => void;
  nextStep: () => void;
  prevStep: () => void;

  setAvailableNotes: (walletNotes: WalletNote[]) => void;
  toggleNoteSelection: (noteIndex: number) => void;
  selectAllNotes: () => void;
  deselectAllNotes: () => void;

  addOutput: () => void;
  updateOutput: (
    id: string,
    updates: Partial<Omit<TransactionOutput, "id">>,
  ) => void;
  removeOutput: (id: string) => void;

  setThreshold: (threshold: number) => void;
  addSigner: () => void;
  updateSigner: (
    id: string,
    updates: Partial<Omit<SignerConfig, "id">>,
  ) => void;
  removeSigner: (id: string) => void;
  setMultisigFromAccount: (threshold: number, signerPkhs: string[]) => void;

  setFeePerWord: (fee: Nicks) => void;
  reset: () => void;
  setError: (error: string | null) => void;

  buildTransaction: (
    totalInputAmount: Nicks,
    totalOutputAmount: Nicks,
    totalFee: Nicks,
  ) => Promise<PendingTransaction | null>;
  addSignature: (txId: string, signerId: string, signature: Uint8Array) => void;
  updateSignedTx: (txId: string, signedTx: Uint8Array) => void;
  broadcastTransaction: (txId: string, txHash: string) => void;
  removePendingTransaction: (txId: string) => void;
  importTransaction: (tx: PendingTransaction) => void;
}

const STEPS: TransactionBuilderStep[] = [
  "inputs",
  "outputs",
  "multisig",
  "review",
];

export const useTransactionStore = create<TransactionStore>()((set, get) => ({
  step: "inputs",
  draft: createEmptyDraft(),
  pendingTransactions: [],
  error: null,
  buildError: null,
  isBuilding: false,

  setStep: (step) => set({ step }),

  nextStep: () => {
    const currentIndex = STEPS.indexOf(get().step);
    const nextStep = STEPS[currentIndex + 1];
    if (currentIndex < STEPS.length - 1 && nextStep) {
      set({ step: nextStep });
    }
  },

  prevStep: () => {
    const currentIndex = STEPS.indexOf(get().step);
    const prevStep = STEPS[currentIndex - 1];
    if (currentIndex > 0 && prevStep) {
      set({ step: prevStep });
    }
  },

  setAvailableNotes: (walletNotes) => {
    const { draft } = get();
    const existingSelections = new Map(
      draft.inputs.map((input) => [
        `${input.nameFirst}-${input.nameLast}`,
        input.selected,
      ]),
    );

    const inputs: TransactionInput[] = walletNotes.map((wn) => {
      const txInput = toTransactionInput(wn);
      const key = `${txInput.nameFirst}-${txInput.nameLast}`;
      return {
        ...txInput,
        selected: existingSelections.get(key) ?? false,
      };
    });

    set({ draft: { ...draft, inputs } });
  },

  toggleNoteSelection: (noteIndex) => {
    const { draft } = get();
    const inputs = [...draft.inputs];
    const input = inputs[noteIndex];
    if (input) {
      inputs[noteIndex] = { ...input, selected: !input.selected };
      set({ draft: { ...draft, inputs } });
    }
  },

  selectAllNotes: () => {
    const { draft } = get();
    set({
      draft: {
        ...draft,
        inputs: draft.inputs.map((input) => ({ ...input, selected: true })),
      },
    });
  },

  deselectAllNotes: () => {
    const { draft } = get();
    set({
      draft: {
        ...draft,
        inputs: draft.inputs.map((input) => ({ ...input, selected: false })),
      },
    });
  },

  addOutput: () => {
    const { draft } = get();
    const newOutput: TransactionOutput = {
      id: generateOutputId(),
      recipientAddress: "",
      amount: 0n as Nicks,
    };
    set({ draft: { ...draft, outputs: [...draft.outputs, newOutput] } });
  },

  updateOutput: (id, updates) => {
    const { draft } = get();
    set({
      draft: {
        ...draft,
        outputs: draft.outputs.map((output) =>
          output.id === id ? { ...output, ...updates } : output,
        ),
      },
    });
  },

  removeOutput: (id) => {
    const { draft } = get();
    set({
      draft: {
        ...draft,
        outputs: draft.outputs.filter((output) => output.id !== id),
      },
    });
  },

  setThreshold: (threshold) => {
    const { draft } = get();
    set({
      draft: {
        ...draft,
        multisigConfig: { ...draft.multisigConfig, threshold },
      },
    });
  },

  addSigner: () => {
    const { draft } = get();
    const newSigner: SignerConfig = {
      id: generateSignerId(),
      publicKeyHash: "",
      label: `Signer ${draft.multisigConfig.signers.length + 1}`,
    };
    set({
      draft: {
        ...draft,
        multisigConfig: {
          ...draft.multisigConfig,
          signers: [...draft.multisigConfig.signers, newSigner],
        },
      },
    });
  },

  updateSigner: (id, updates) => {
    const { draft } = get();

    // Prevent duplicate PKH
    if (updates.publicKeyHash) {
      const normalizedPkh = updates.publicKeyHash.toLowerCase().trim();
      const isDuplicate = draft.multisigConfig.signers.some(
        (s) =>
          s.id !== id && s.publicKeyHash.toLowerCase().trim() === normalizedPkh,
      );
      if (isDuplicate) {
        return; // Silently reject duplicate
      }
    }

    set({
      draft: {
        ...draft,
        multisigConfig: {
          ...draft.multisigConfig,
          signers: draft.multisigConfig.signers.map((signer) =>
            signer.id === id ? { ...signer, ...updates } : signer,
          ),
        },
      },
    });
  },

  removeSigner: (id) => {
    const { draft } = get();
    const newSigners = draft.multisigConfig.signers.filter((s) => s.id !== id);
    set({
      draft: {
        ...draft,
        multisigConfig: {
          ...draft.multisigConfig,
          signers: newSigners,
          threshold: Math.min(
            draft.multisigConfig.threshold,
            newSigners.length,
          ),
        },
      },
    });
  },

  setMultisigFromAccount: (threshold, signerPkhs) => {
    const { draft } = get();
    const signers: SignerConfig[] = signerPkhs.map((pkh, index) => ({
      id: generateSignerId(),
      publicKeyHash: pkh,
      label: `Signer ${index + 1}`,
    }));
    set({
      draft: {
        ...draft,
        multisigConfig: {
          threshold,
          signers,
        },
      },
    });
  },

  setFeePerWord: (fee) => {
    const { draft } = get();
    set({ draft: { ...draft, feePerWord: fee } });
  },

  reset: () => {
    set({
      step: "inputs",
      draft: createEmptyDraft(),
      error: null,
    });
  },

  setError: (error) => set({ error }),

  buildTransaction: async (totalInputAmount, totalOutputAmount, totalFee) => {
    const { draft, pendingTransactions } = get();
    const selectedInputs = draft.inputs.filter((i) => i.selected);

    const walletNotes = useWalletStore.getState().notes;
    const selectedNotes: WalletNote[] = selectedInputs
      .map((input) =>
        walletNotes.find(
          (wn) =>
            wn.display.nameFirst === input.nameFirst &&
            wn.display.nameLast === input.nameLast,
        ),
      )
      .filter((note): note is WalletNote => note !== undefined);

    set({ isBuilding: true, buildError: null });

    const result = await buildTx(
      draft,
      selectedNotes,
      totalInputAmount,
      totalOutputAmount,
      totalFee,
    );

    if (!result.ok) {
      set({ isBuilding: false, buildError: result.error });
      return null;
    }

    const pendingTx: PendingTransaction = {
      id: generateTransactionId(),
      createdAt: Date.now(),
      draft: { ...draft },
      selectedInputs,
      totalInputAmount,
      totalOutputAmount,
      totalFee,
      signatures: draft.multisigConfig.signers.map((signer) => ({
        signerId: signer.id,
        signature: null,
        signedAt: null,
      })),
      status: "pending",
      rawTxJam: result.value.rawTxJam,
      txHash: result.value.txHash,
      noteProtobufs: selectedNotes.map((wn) => wn.noteProtobuf),
      spendConditionProtobufs: selectedNotes.map((wn) => wn.spendConditionProtobuf),
    };

    set({
      pendingTransactions: [...pendingTransactions, pendingTx],
      step: "inputs",
      draft: createEmptyDraft(),
      isBuilding: false,
    });

    return pendingTx;
  },

  addSignature: (txId, signerId, signature) => {
    const { pendingTransactions } = get();
    const updatedTxs = pendingTransactions.map((tx) => {
      if (tx.id !== txId) return tx;

      const updatedSignatures = tx.signatures.map((sig) =>
        sig.signerId === signerId
          ? { ...sig, signature, signedAt: Date.now() }
          : sig,
      );

      const signedCount = updatedSignatures.filter(
        (s) => s.signature !== null,
      ).length;
      const isReady = signedCount >= tx.draft.multisigConfig.threshold;

      return {
        ...tx,
        signatures: updatedSignatures,
        status: isReady ? "ready" : "pending",
      } as PendingTransaction;
    });

    set({ pendingTransactions: updatedTxs });
  },

  updateSignedTx: (txId, signedTx) => {
    const { pendingTransactions } = get();
    const updatedTxs = pendingTransactions.map((tx) =>
      tx.id === txId ? { ...tx, signedTx } : tx,
    );
    set({ pendingTransactions: updatedTxs });
  },

  broadcastTransaction: (txId, txHash) => {
    const { pendingTransactions } = get();
    const updatedTxs = pendingTransactions.map((tx) =>
      tx.id === txId ? { ...tx, status: "broadcast" as const, txHash } : tx,
    );
    set({ pendingTransactions: updatedTxs });
  },

  removePendingTransaction: (txId) => {
    const { pendingTransactions } = get();
    set({
      pendingTransactions: pendingTransactions.filter((tx) => tx.id !== txId),
    });
  },

  importTransaction: (tx) => {
    const { pendingTransactions } = get();
    if (!pendingTransactions.some((p) => p.id === tx.id)) {
      set({ pendingTransactions: [...pendingTransactions, tx] });
    }
  },
}));
