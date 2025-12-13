import { useCallback, useMemo } from 'react';
import { useWalletStore } from './wallet-store';
import { getWalletService } from './wallet-service';
import { Nicks } from '@/shared/types';

export function useWallet() {
  const { status, connection, notes, error, isTestMode, connect, disconnect, clearError, useTestMode } = useWalletStore();

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';
  const hasError = status === 'error';

  const totalBalance = useMemo(() => {
    return notes.reduce((acc, wn) => Nicks.fromBigInt(acc + wn.display.assets), Nicks.ZERO);
  }, [notes]);

  const formattedBalance = useMemo(() => {
    const nock = Nicks.toNock(totalBalance);
    return `${nock.toLocaleString()} NOCK`;
  }, [totalBalance]);

  const shortAddress = useMemo(() => {
    if (!connection?.pkh) return null;
    const pkh = connection.pkh as string;
    return `${pkh.slice(0, 8)}...${pkh.slice(-6)}`;
  }, [connection]);

  const isExtensionInstalled = useCallback(() => {
    return getWalletService().isExtensionInstalled();
  }, []);

  return {
    status,
    connection,
    notes,
    error,
    isConnected,
    isConnecting,
    hasError,
    isTestMode,
    totalBalance,
    formattedBalance,
    shortAddress,
    connect,
    disconnect,
    clearError,
    isExtensionInstalled,
    useTestMode,
  };
}
