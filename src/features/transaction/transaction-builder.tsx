import {
  ArrowLeft,
  ArrowRight,
  Send,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/shared/components";
import { StepIndicator } from "./step-indicator";
import { InputSelector } from "./input-selector";
import { OutputForm } from "./output-form";
import { MultisigConfig } from "./multisig-config";
import { TransactionReview } from "./transaction-review";
import { useTransactionBuilder } from "@/shared/hooks/use-transaction-builder";

interface TransactionBuilderProps {
  onBuildComplete?: () => void;
}

export function TransactionBuilder({
  onBuildComplete,
}: TransactionBuilderProps) {
  const {
    step,
    canProceed,
    validationError,
    isFirstStep,
    isConnected,
    isBuilding,
    buildError,
    nextStep,
    prevStep,
    buildTransaction,
  } = useTransactionBuilder();

  const isLastStep = step === "review";

  const handleNext = async () => {
    if (isLastStep) {
      const result = await buildTransaction();
      if (result) {
        onBuildComplete?.();
      }
    } else {
      nextStep();
    }
  };

  const handlePrev = () => {
    prevStep();
  };

  const renderStep = () => {
    switch (step) {
      case "inputs":
        return <InputSelector />;
      case "outputs":
        return <OutputForm />;
      case "multisig":
        return <MultisigConfig />;
      case "review":
        return <TransactionReview />;
      default:
        return null;
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-14 w-14 bg-tertiary rounded-xl flex items-center justify-center mb-4">
          <svg
            className="h-7 w-7 text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <p className="text-secondary font-medium">Wallet not connected</p>
        <p className="text-sm text-muted mt-1">
          Connect your wallet to start building transactions
        </p>
      </div>
    );
  }

  return (
    <div>
      <StepIndicator currentStep={step} />

      <div className="min-h-[360px]">{renderStep()}</div>

      {(validationError || buildError) && (
        <div className="flex items-start gap-2 p-3 mt-4 bg-[var(--color-error)]/10 text-[var(--color-error)]">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{validationError || buildError?.message}</p>
        </div>
      )}

      <div className="flex items-center justify-between mt-6 pt-6 border-t border-[var(--color-border)]">
        {!isFirstStep ? (
          <Button
            variant="secondary"
            onClick={handlePrev}
            disabled={isBuilding}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        ) : (
          <div />
        )}

        <Button
          variant="primary"
          onClick={handleNext}
          disabled={!canProceed || isBuilding}
          className="gap-2"
        >
          {isBuilding ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Building...
            </>
          ) : isLastStep ? (
            <>
              Build & Sign
              <Send className="h-4 w-4" />
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
