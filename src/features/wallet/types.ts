import type { Digest } from '@/shared/types';
import type { Result } from '@/shared/lib/result';
import type { WalletNote } from './wallet-store';

export interface ConnectionInfo {
  pkh: Digest;
  grpcEndpoint: string;
}

export type WalletError =
  | { code: 'NOT_INSTALLED'; message: string }
  | { code: 'USER_REJECTED'; message: string }
  | { code: 'CONNECTION_FAILED'; message: string }
  | { code: 'SIGNING_FAILED'; message: string }
  | { code: 'UNKNOWN'; message: string };

export interface IWalletService {
  connect(): Promise<Result<ConnectionInfo, WalletError>>;
  disconnect(): void;
  fetchNotes(lockDigest: Digest): Promise<Result<WalletNote[], WalletError>>;
  signTransaction(rawTx: unknown, metadata: SigningMetadata): Promise<Result<Uint8Array, WalletError>>;
  broadcastTransaction(signedTx: unknown): Promise<Result<string, WalletError>>;
  isExtensionInstalled(): boolean;
}

export interface SigningMetadata {
  notes: unknown[];
  spendConditions: unknown[];
}

export function createWalletError(code: WalletError['code'], message: string): WalletError {
  return { code, message };
}
