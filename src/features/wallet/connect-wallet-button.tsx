import { Wallet, LogOut, FlaskConical } from "lucide-react";
import { Button } from "@/shared/components";
import { useWallet } from "./use-wallet";

export function ConnectWalletButton() {
  const {
    isConnected,
    isConnecting,
    hasError,
    isTestMode,
    shortAddress,
    formattedBalance,
    connect,
    disconnect,
    useTestMode,
  } = useWallet();

  if (isConnected && shortAddress) {
    return (
      <div className="flex items-center gap-1 sm:gap-3">
        {isTestMode && (
          <span className="badge badge-accent text-xs !hidden md:!inline-flex">Test Mode</span>
        )}
        <div className="text-right hidden md:block">
          <p className="text-sm font-medium font-mono">{shortAddress}</p>
          <p className="text-xs text-accent font-mono">{formattedBalance}</p>
        </div>
        <div className="flex md:hidden items-center gap-1.5">
          {isTestMode && <FlaskConical className="h-3.5 w-3.5 text-accent" />}
          <span className="text-xs font-medium font-mono">{shortAddress}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={disconnect}
          title="Disconnect"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button onClick={useTestMode} variant="secondary" className="gap-2">
        <FlaskConical className="h-4 w-4" />
        <span className="hidden md:inline">Test Mode</span>
      </Button>
      <Button
        onClick={connect}
        loading={isConnecting}
        variant={hasError ? "destructive" : "primary"}
        className="gap-2"
      >
        <Wallet className="h-4 w-4" />
        <span className="hidden md:inline">{isConnecting ? "Connecting..." : "Connect"}</span>
      </Button>
    </div>
  );
}
