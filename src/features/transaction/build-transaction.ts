import {
  getNote,
  getNoteHash,
  getSpendCondition,
  type WalletNote,
} from "@/features/wallet/wallet-store";
import { Result } from "@/shared/lib/result";
import { wasm } from "@/shared/lib/wasm";
import type { Nicks } from "@/shared/types";
import type {
  PendingTransaction,
  TransactionDraft,
} from "@/shared/types/types";

export interface BuildTransactionResult {
  txHash: string;
  rawTxJam: Uint8Array;
}

export interface TransactionBuildError {
  code:
    | "INSUFFICIENT_FUNDS"
    | "INVALID_OUTPUT"
    | "INVALID_MULTISIG"
    | "BUILD_FAILED"
    | "SIMULATION_FAILED";
  message: string;
  details?: string;
}

export interface SimulationResult {
  valid: boolean;
  signatureCount: number;
  requiredSignatures: number;
  estimatedSize: number;
  warnings: string[];
}

function createError(
  code: TransactionBuildError["code"],
  message: string,
  details?: string,
): TransactionBuildError {
  const error: TransactionBuildError = { code, message };
  if (details !== undefined) {
    error.details = details;
  }
  return error;
}

function parseWasmError(error: unknown): { message: string; details: string } {
  const rawMessage = error instanceof Error ? error.message : String(error);

  const errorMappings: Array<{ pattern: RegExp; message: string }> = [
    {
      pattern: /insufficient.*funds?/i,
      message: "Insufficient funds to complete this transaction",
    },
    {
      pattern: /invalid.*signature/i,
      message: "One or more signatures are invalid",
    },
    {
      pattern: /invalid.*address|invalid.*pkh/i,
      message: "Invalid recipient address format",
    },
    {
      pattern: /duplicate.*input|double.*spend/i,
      message: "Transaction contains duplicate inputs (potential double-spend)",
    },
    {
      pattern: /overflow/i,
      message: "Transaction amount exceeds maximum allowed value",
    },
    {
      pattern: /underflow/i,
      message: "Transaction would result in negative balance",
    },
    {
      pattern: /invalid.*fee/i,
      message: "Transaction fee is invalid or too low",
    },
    {
      pattern: /malformed|parse.*error|deserialize/i,
      message: "Transaction data is malformed or corrupted",
    },
    {
      pattern: /lock.*hash|spend.*condition/i,
      message: "Invalid lock or spend condition configuration",
    },
    {
      pattern: /threshold/i,
      message: "Signature threshold configuration is invalid",
    },
    {
      pattern: /timeout|network/i,
      message: "Network timeout - please try again",
    },
    {
      pattern: /not.*found/i,
      message: "Referenced note or resource not found on chain",
    },
    {
      pattern: /already.*spent/i,
      message: "One or more notes have already been spent",
    },
  ];

  for (const { pattern, message } of errorMappings) {
    if (pattern.test(rawMessage)) {
      return { message, details: rawMessage };
    }
  }

  return {
    message: "Transaction operation failed",
    details: rawMessage,
  };
}

function tryWasm<T>(
  operation: () => T,
  context: string,
): Result<T, TransactionBuildError> {
  try {
    return Result.ok(operation());
  } catch (error) {
    const { message, details } = parseWasmError(error);
    return Result.err(createError("BUILD_FAILED", `${context}: ${message}`, details));
  }
}

export async function simulateTransaction(
  tx: PendingTransaction,
  isTestMode = false,
): Promise<Result<SimulationResult, TransactionBuildError>> {
  const warnings: string[] = [];

  try {
    if (!tx.rawTxJam || tx.rawTxJam.length === 0) {
      return Result.err(
        createError(
          "SIMULATION_FAILED",
          "Transaction data is missing",
          "The rawTxJam field is empty or undefined",
        ),
      );
    }

    const signatureCount = tx.signatures.filter(
      (s) => s.signature !== null,
    ).length;
    const requiredSignatures = tx.draft.multisigConfig.threshold;

    if (signatureCount < requiredSignatures) {
      return Result.err(
        createError(
          "SIMULATION_FAILED",
          `Insufficient signatures: ${signatureCount} of ${requiredSignatures} required`,
          `Need ${requiredSignatures - signatureCount} more signature(s) before broadcasting`,
        ),
      );
    }

    if (tx.selectedInputs.length === 0) {
      return Result.err(
        createError(
          "SIMULATION_FAILED",
          "Transaction has no inputs",
          "At least one input note must be selected",
        ),
      );
    }

    if (tx.draft.outputs.length === 0) {
      return Result.err(
        createError(
          "SIMULATION_FAILED",
          "Transaction has no outputs",
          "At least one output recipient is required",
        ),
      );
    }

    const totalInput = tx.totalInputAmount;
    const totalOutput = tx.totalOutputAmount;
    const fee = tx.totalFee;

    if (fee > totalOutput) {
      warnings.push("Transaction fee is higher than the output amount");
    }

    const changeAmount = totalInput - totalOutput - fee;
    if (changeAmount < 0n) {
      return Result.err(
        createError(
          "SIMULATION_FAILED",
          "Transaction would result in negative balance",
          `Input: ${totalInput}, Output: ${totalOutput}, Fee: ${fee}`,
        ),
      );
    }

    const estimatedSize = tx.rawTxJam.length + signatureCount * 64;

    if (isTestMode) {
      warnings.push("Test mode: WASM validation skipped");
      return Result.ok({
        valid: true,
        signatureCount,
        requiredSignatures,
        estimatedSize,
        warnings,
      });
    }

    try {
      const nockchainTx = wasm.NockchainTx.fromJam(tx.rawTxJam);
      if (!nockchainTx) {
        warnings.push("Transaction could not be fully validated");
      }
    } catch (parseError) {
      const { message, details } = parseWasmError(parseError);
      return Result.err(createError("SIMULATION_FAILED", message, details));
    }

    return Result.ok({
      valid: true,
      signatureCount,
      requiredSignatures,
      estimatedSize,
      warnings,
    });
  } catch (error) {
    const { message, details } = parseWasmError(error);
    return Result.err(createError("SIMULATION_FAILED", message, details));
  }
}

const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const BASE58_PATTERN = new RegExp(`^[${BASE58_ALPHABET}]+$`);

export function isValidPkh(pkh: string): boolean {
  if (!pkh || typeof pkh !== "string") return false;
  if (pkh.length < 40 || pkh.length > 60) return false;
  return BASE58_PATTERN.test(pkh);
}

export async function buildTransaction(
  draft: TransactionDraft,
  selectedNotes: WalletNote[],
  totalInputAmount: Nicks,
  totalOutputAmount: Nicks,
  estimatedFee: Nicks,
): Promise<Result<BuildTransactionResult, TransactionBuildError>> {
  const totalNeeded = totalOutputAmount + estimatedFee;
  if (totalInputAmount < totalNeeded) {
    return Result.err(
      createError(
        "INSUFFICIENT_FUNDS",
        `Insufficient funds: have ${totalInputAmount} nicks, need ${totalNeeded} nicks`,
      ),
    );
  }

  if (draft.outputs.length === 0) {
    return Result.err(
      createError("INVALID_OUTPUT", "At least one output is required"),
    );
  }

  for (const output of draft.outputs) {
    if (!output.recipientAddress || output.amount <= 0n) {
      return Result.err(
        createError(
          "INVALID_OUTPUT",
          "All outputs must have a valid recipient address and positive amount",
        ),
      );
    }
    if (!isValidPkh(output.recipientAddress)) {
      return Result.err(
        createError(
          "INVALID_OUTPUT",
          `Invalid recipient address format: ${output.recipientAddress.slice(0, 20)}...`,
        ),
      );
    }
  }

  const { threshold, signers } = draft.multisigConfig;
  if (signers.length === 0) {
    return Result.err(
      createError("INVALID_MULTISIG", "At least one signer is required"),
    );
  }
  if (threshold < 1 || threshold > signers.length) {
    return Result.err(
      createError(
        "INVALID_MULTISIG",
        `Invalid threshold: ${threshold} of ${signers.length} signers`,
      ),
    );
  }

  for (const signer of signers) {
    if (!isValidPkh(signer.publicKeyHash)) {
      return Result.err(
        createError(
          "INVALID_MULTISIG",
          `Invalid public key hash for ${signer.label || "signer"}`,
        ),
      );
    }
  }

  const wasmNotesResult = tryWasm(
    () => selectedNotes.map((wn) => getNote(wn)),
    "Failed to parse notes",
  );
  if (!wasmNotesResult.ok) return wasmNotesResult;
  const wasmNotes = wasmNotesResult.value;

  const wasmSpendConditionsResult = tryWasm(
    () => selectedNotes.map((wn) => getSpendCondition(wn)),
    "Failed to parse spend conditions",
  );
  if (!wasmSpendConditionsResult.ok) return wasmSpendConditionsResult;
  const wasmSpendConditions = wasmSpendConditionsResult.value;

  const txBuilderResult = tryWasm(
    () => new wasm.TxBuilder(BigInt(draft.feePerWord.toString())),
    "Failed to initialize transaction builder",
  );
  if (!txBuilderResult.ok) return txBuilderResult;
  const txBuilder = txBuilderResult.value;

  // Change (refund) goes back to the same multisig lock.
  // This ensures leftover funds remain under M-of-N control rather than
  // being sent to a single signer, which would be a security issue.
  const refundLockResult = tryWasm(
    () =>
      wasm.SpendCondition.newPkh(
        signers.length > 1
          ? new wasm.Pkh(BigInt(threshold), signers.map((s) => s.publicKeyHash))
          : wasm.Pkh.single(signers[0]!.publicKeyHash),
      ),
    "Failed to create refund lock",
  );
  if (!refundLockResult.ok) return refundLockResult;
  const refundLock = refundLockResult.value;

  for (let i = 0; i < wasmNotes.length; i++) {
    const note = wasmNotes[i]!;
    const spendCondition = wasmSpendConditions[i]!;

    const spendBuilderResult = tryWasm(
      () => new wasm.SpendBuilder(note, spendCondition, refundLock),
      `Failed to create spend builder for note ${i}`,
    );
    if (!spendBuilderResult.ok) return spendBuilderResult;
    const spendBuilder = spendBuilderResult.value;

    // Seeds (outputs) are only added to the first spend. Other input notes
    // just contribute to the total with their refunds computed separately.
    if (i === 0) {
      for (const output of draft.outputs) {
        const recipientPkhResult = tryWasm(
          () => wasm.Pkh.single(output.recipientAddress),
          "Failed to create recipient PKH",
        );
        if (!recipientPkhResult.ok) return recipientPkhResult;

        const recipientSpendConditionResult = tryWasm(
          () => wasm.SpendCondition.newPkh(recipientPkhResult.value),
          "Failed to create recipient spend condition",
        );
        if (!recipientSpendConditionResult.ok) return recipientSpendConditionResult;

        // Seed expects a digest (lock hash), not a raw address.
        // firstName() gives us the lock hash for the recipient's spend condition.
        const recipientDigestResult = tryWasm(
          () => recipientSpendConditionResult.value.firstName(),
          "Failed to get recipient firstName",
        );
        if (!recipientDigestResult.ok) return recipientDigestResult;

        const parentHashResult = tryWasm(
          () => getNoteHash(selectedNotes[i]!),
          "Failed to get note hash",
        );
        if (!parentHashResult.ok) return parentHashResult;

        // include_lock_data=false: We don't add %lock key to note-data.
        // Setting true would cost 1 << 15 nicks and is only needed if
        // recipients need to inspect the lock structure on-chain.
        const seedResult = tryWasm(
          () =>
            wasm.Seed.newSinglePkh(
              recipientDigestResult.value,
              BigInt(output.amount.toString()),
              parentHashResult.value,
              false,
            ),
          "Failed to create seed",
        );
        if (!seedResult.ok) return seedResult;

        const addSeedResult = tryWasm(
          () => spendBuilder.seed(seedResult.value),
          "Failed to add seed to spend",
        );
        if (!addSeedResult.ok) return addSeedResult;
      }
    }

    const computeRefundResult = tryWasm(
      () => spendBuilder.computeRefund(false),
      `Failed to compute refund for note ${i}`,
    );
    if (!computeRefundResult.ok) return computeRefundResult;

    if (!spendBuilder.isBalanced()) {
      return Result.err(
        createError(
          "BUILD_FAILED",
          `Spend ${i} is not balanced: input assets do not equal seeds + fee`,
        ),
      );
    }

    const addSpendResult = tryWasm(
      () => txBuilder.spend(spendBuilder),
      `Failed to add spend ${i} to transaction`,
    );
    if (!addSpendResult.ok) return addSpendResult;
  }

  // We use build() instead of validate() because validate() is stricter:
  // it expects signatures and checks fees. For unsigned multisig transactions
  // that will be signed later by co-signers, validate() would fail.
  const nockchainTxResult = tryWasm(
    () => txBuilder.build(),
    "Failed to build transaction",
  );
  if (!nockchainTxResult.ok) return nockchainTxResult;

  const txHashResult = tryWasm(
    () => nockchainTxResult.value.id.value,
    "Failed to get transaction hash",
  );
  if (!txHashResult.ok) return txHashResult;

  const rawTxJamResult = tryWasm(
    () => nockchainTxResult.value.toJam(),
    "Failed to serialize transaction",
  );
  if (!rawTxJamResult.ok) return rawTxJamResult;

  return Result.ok({ txHash: txHashResult.value, rawTxJam: rawTxJamResult.value });
}

export { parseWasmError };
