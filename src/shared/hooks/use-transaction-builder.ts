import { useMemo, useEffect, useRef } from "react";
import { useWallet } from "@/features/wallet";
import { Nicks } from "@/shared/types";
import { useTransactionStore } from "./transaction-store";
import { isValidPkh } from "@/features/transaction/build-transaction";

export function useTransactionBuilder() {
  const {
    step,
    draft,
    pendingTransactions,
    error,
    buildError,
    isBuilding,
    setStep,
    nextStep,
    prevStep,
    setAvailableNotes,
    toggleNoteSelection,
    selectAllNotes,
    deselectAllNotes,
    addOutput,
    updateOutput,
    removeOutput,
    setThreshold,
    addSigner,
    updateSigner,
    removeSigner,
    setFeePerWord,
    reset,
    setError,
    buildTransaction,
    addSignature,
    removePendingTransaction,
  } = useTransactionStore();

  const { notes, isConnected, connection } = useWallet();

  const prevPkhRef = useRef<string | null>(null);

  useEffect(() => {
    const currentPkh = connection?.pkh ?? null;

    if (currentPkh !== prevPkhRef.current) {
      prevPkhRef.current = currentPkh;
      if (notes.length > 0) {
        setAvailableNotes(notes);
      } else if (!isConnected) {
        setAvailableNotes([]);
      }
    } else if (notes.length > 0 && draft.inputs.length === 0) {
      setAvailableNotes(notes);
    }
  }, [
    notes,
    isConnected,
    connection?.pkh,
    draft.inputs.length,
    setAvailableNotes,
  ]);

  const selectedInputs = useMemo(
    () => draft.inputs.filter((input) => input.selected),
    [draft.inputs],
  );

  const totalInputAmount = useMemo(
    () =>
      selectedInputs.reduce(
        (sum, input) => Nicks.fromBigInt(sum + input.assets),
        Nicks.ZERO,
      ),
    [selectedInputs],
  );

  const totalOutputAmount = useMemo(
    () =>
      draft.outputs.reduce(
        (sum, output) => Nicks.fromBigInt(sum + output.amount),
        Nicks.ZERO,
      ),
    [draft.outputs],
  );

  const estimatedFee = useMemo(() => {
    const baseSize = 100n;
    const inputSize = BigInt(selectedInputs.length) * 50n;
    const outputSize = BigInt(draft.outputs.length) * 40n;
    const totalSize = baseSize + inputSize + outputSize;
    return Nicks.fromBigInt(totalSize * draft.feePerWord);
  }, [selectedInputs.length, draft.outputs.length, draft.feePerWord]);

  const remainingBalance = useMemo(() => {
    const remaining = totalInputAmount - totalOutputAmount - estimatedFee;
    return remaining as Nicks;
  }, [totalInputAmount, totalOutputAmount, estimatedFee]);

  const canProceedFromInputs = selectedInputs.length > 0;

  const canProceedFromOutputs = useMemo(() => {
    if (draft.outputs.length === 0) return false;

    // Check all outputs have valid address and positive amount
    const allOutputsValid = draft.outputs.every(
      (output) =>
        output.recipientAddress.length > 0 &&
        output.amount > 0n &&
        isValidPkh(output.recipientAddress),
    );
    if (!allOutputsValid) return false;

    // Check total output doesn't exceed available funds
    const hasEnoughFunds = totalInputAmount >= totalOutputAmount + estimatedFee;
    return hasEnoughFunds;
  }, [draft.outputs, totalInputAmount, totalOutputAmount, estimatedFee]);

  const canProceedFromMultisig = useMemo(() => {
    const { threshold, signers } = draft.multisigConfig;
    if (signers.length === 0) return false;
    if (threshold < 1 || threshold > signers.length) return false;
    return signers.every((signer) => isValidPkh(signer.publicKeyHash));
  }, [draft.multisigConfig]);

  const canProceedFromReview = useMemo(() => {
    if (!canProceedFromInputs) return false;
    if (!canProceedFromOutputs) return false;
    if (!canProceedFromMultisig) return false;
    return totalInputAmount >= totalOutputAmount + estimatedFee;
  }, [
    canProceedFromInputs,
    canProceedFromOutputs,
    canProceedFromMultisig,
    totalInputAmount,
    totalOutputAmount,
    estimatedFee,
  ]);

  const validationError = useMemo((): string | null => {
    switch (step) {
      case "inputs":
        if (selectedInputs.length === 0) return "Select at least one input note";
        break;

      case "outputs":
        if (draft.outputs.length === 0) return "Add at least one output";
        for (const output of draft.outputs) {
          if (!output.recipientAddress) return "Enter recipient address";
          if (!isValidPkh(output.recipientAddress)) return "Invalid recipient address";
          if (output.amount <= 0n) return "Enter a positive amount";
        }
        if (totalInputAmount < totalOutputAmount + estimatedFee) return "Insufficient funds";
        break;

      case "multisig": {
        const { threshold, signers } = draft.multisigConfig;
        if (signers.length === 0) return "Add at least one signer";
        if (threshold < 1) return "Threshold must be at least 1";
        if (threshold > signers.length) return "Threshold exceeds number of signers";
        const invalidSigner = signers.find((s) => !isValidPkh(s.publicKeyHash));
        if (invalidSigner) return `Invalid PKH for ${invalidSigner.label || "signer"}`;
        break;
      }

      case "review":
        if (totalInputAmount < totalOutputAmount + estimatedFee) return "Insufficient funds";
        break;
    }
    return null;
  }, [step, selectedInputs.length, draft.outputs, draft.multisigConfig, totalInputAmount, totalOutputAmount, estimatedFee]);

  const canProceed = useMemo(() => {
    switch (step) {
      case "inputs":
        return canProceedFromInputs;
      case "outputs":
        return canProceedFromOutputs;
      case "multisig":
        return canProceedFromMultisig;
      case "review":
        return canProceedFromReview;
      default:
        return false;
    }
  }, [
    step,
    canProceedFromInputs,
    canProceedFromOutputs,
    canProceedFromMultisig,
    canProceedFromReview,
  ]);

  const isFirstStep = step === "inputs";
  const isLastStep = step === "review";

  const handleBuildTransaction = async () => {
    return buildTransaction(totalInputAmount, totalOutputAmount, estimatedFee);
  };

  return {
    step,
    draft,
    pendingTransactions,
    error,
    buildError,
    isBuilding,
    isConnected,
    selectedInputs,
    totalInputAmount,
    totalOutputAmount,
    estimatedFee,
    remainingBalance,
    canProceed,
    validationError,
    isFirstStep,
    isLastStep,

    setStep,
    nextStep,
    prevStep,
    toggleNoteSelection,
    selectAllNotes,
    deselectAllNotes,
    addOutput,
    updateOutput,
    removeOutput,
    setThreshold,
    addSigner,
    updateSigner,
    removeSigner,
    setFeePerWord,
    reset,
    setError,
    buildTransaction: handleBuildTransaction,
    addSignature,
    removePendingTransaction,
  };
}
