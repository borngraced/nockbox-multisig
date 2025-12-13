import { NockchainProvider } from '@nockbox/iris-sdk';
import { wasm } from '@/shared/lib/wasm';
import { Result } from '@/shared/lib/result';
import type { Digest } from '@/shared/types';
import type { IWalletService, ConnectionInfo, SigningMetadata, WalletError } from './types';
import { createWalletError } from './types';
import type { WalletNote } from './wallet-store';

export class WalletService implements IWalletService {
  private provider: NockchainProvider | null = null;
  private grpcClient: InstanceType<typeof wasm.GrpcClient> | null = null;

  isExtensionInstalled(): boolean {
    return typeof window !== 'undefined' && window.nockchain !== undefined;
  }

  async connect(): Promise<Result<ConnectionInfo, WalletError>> {
    if (!this.isExtensionInstalled()) {
      return Result.err(createWalletError('NOT_INSTALLED', 'Iris Wallet extension is not installed'));
    }

    try {
      this.provider = new NockchainProvider();
      const { pkh, grpcEndpoint } = await this.provider.connect();

      this.grpcClient = new wasm.GrpcClient(grpcEndpoint);

      return Result.ok({
        pkh: pkh as Digest,
        grpcEndpoint,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection failed';
      if (message.includes('rejected') || message.includes('denied')) {
        return Result.err(createWalletError('USER_REJECTED', 'User rejected the connection request'));
      }
      return Result.err(createWalletError('CONNECTION_FAILED', message));
    }
  }

  disconnect(): void {
    this.provider = null;
    this.grpcClient = null;
  }

  async fetchNotes(lockDigest: Digest): Promise<Result<WalletNote[], WalletError>> {
    if (!this.grpcClient) {
      return Result.err(createWalletError('CONNECTION_FAILED', 'Not connected to wallet'));
    }

    try {
      const balance = await this.grpcClient.getBalanceByFirstName(lockDigest as string);
      const notes = this.mapBalanceToWalletNotes(balance, lockDigest);
      return Result.ok(notes);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch notes';
      return Result.err(createWalletError('UNKNOWN', message));
    }
  }

  async signTransaction(
    rawTx: unknown,
    metadata: SigningMetadata
  ): Promise<Result<Uint8Array, WalletError>> {
    if (!this.provider) {
      return Result.err(createWalletError('CONNECTION_FAILED', 'Not connected to wallet'));
    }

    try {
      const signedTx = await this.provider.signRawTx({
        rawTx,
        notes: metadata.notes,
        spendConditions: metadata.spendConditions,
      });
      return Result.ok(signedTx);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Signing failed';
      if (message.includes('rejected') || message.includes('denied')) {
        return Result.err(createWalletError('USER_REJECTED', 'User rejected the signing request'));
      }
      return Result.err(createWalletError('SIGNING_FAILED', message));
    }
  }

  async broadcastTransaction(signedTx: unknown): Promise<Result<string, WalletError>> {
    if (!this.grpcClient) {
      return Result.err(createWalletError('CONNECTION_FAILED', 'Not connected to wallet'));
    }

    try {
      const result = await this.grpcClient.sendTransaction(signedTx);
      const txHash = typeof result === 'string' ? result : String(result);
      return Result.ok(txHash);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Broadcast failed';
      return Result.err(createWalletError('UNKNOWN', message));
    }
  }

  private mapBalanceToWalletNotes(balance: unknown, lockDigest: Digest): WalletNote[] {
    if (!balance || typeof balance !== 'object') return [];

    const balanceObj = balance as Record<string, unknown>;
    const notesArray = balanceObj['notes'];

    if (!Array.isArray(notesArray)) return [];

    const walletNotes: WalletNote[] = [];

    for (const entry of notesArray) {
      try {
        if (!entry || typeof entry !== 'object') continue;
        const noteEntry = entry as { note?: Uint8Array; spendCondition?: Uint8Array };

        if (noteEntry.note) {
          const note = wasm.Note.fromProtobuf(noteEntry.note);

          let spendConditionProtobuf: Uint8Array;
          if (noteEntry.spendCondition) {
            spendConditionProtobuf = noteEntry.spendCondition;
          } else {
            const pkh = wasm.Pkh.single(lockDigest);
            const spendCondition = wasm.SpendCondition.newPkh(pkh);
            spendConditionProtobuf = spendCondition.toProtobuf();
          }

          const display = {
            nameFirst: note.name.first,
            nameLast: note.name.last,
            assets: note.assets,
            originPage: note.originPage,
          };

          walletNotes.push({
            noteProtobuf: noteEntry.note,
            spendConditionProtobuf,
            noteHash: note.hash().value,
            display,
          });
        }
      } catch {
        continue;
      }
    }

    return walletNotes;
  }
}

let walletServiceInstance: WalletService | null = null;

export function getWalletService(): WalletService {
  if (!walletServiceInstance) {
    walletServiceInstance = new WalletService();
  }
  return walletServiceInstance;
}
