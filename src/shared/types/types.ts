import type { Nicks } from "@/shared/types";

export interface TransactionInput {
  nameFirst: string;
  nameLast: string;
  assets: bigint;
  originPage: bigint;
  selected: boolean;
}

export interface TransactionOutput {
  id: string;
  recipientAddress: string;
  amount: Nicks;
}

export interface MultisigConfig {
  threshold: number;
  signers: SignerConfig[];
}

export interface SignerConfig {
  id: string;
  publicKeyHash: string;
  label: string;
}

export interface TransactionDraft {
  inputs: TransactionInput[];
  outputs: TransactionOutput[];
  multisigConfig: MultisigConfig;
  feePerWord: Nicks;
}

export type TransactionBuilderStep =
  | "inputs"
  | "outputs"
  | "multisig"
  | "review";

export interface PendingTransaction {
  id: string;
  createdAt: number;
  draft: TransactionDraft;
  selectedInputs: TransactionInput[];
  totalInputAmount: Nicks;
  totalOutputAmount: Nicks;
  totalFee: Nicks;
  signatures: SignatureRecord[];
  status: "pending" | "ready" | "broadcast" | "confirmed";
  txHash?: string;
  rawTxJam: Uint8Array;
  signedTx?: Uint8Array;
  noteProtobufs: Uint8Array[];
  spendConditionProtobufs: Uint8Array[];
}

export interface SignatureRecord {
  signerId: string;
  signature: Uint8Array | null;
  signedAt: number | null;
}

export const createEmptyDraft = (): TransactionDraft => ({
  inputs: [],
  outputs: [],
  multisigConfig: {
    threshold: 1,
    signers: [],
  },
  feePerWord: 32768n as Nicks,
});

const generateId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const generateOutputId = (): string => generateId("output");
export const generateSignerId = (): string => generateId("signer");
export const generateTransactionId = (): string => generateId("tx");
