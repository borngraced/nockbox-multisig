import { cn } from '@/shared/lib/cn';
import type { TransactionBuilderStep } from '@/shared/types/types';

interface StepIndicatorProps {
  currentStep: TransactionBuilderStep;
  skipMultisig?: boolean;
}

const ALL_STEPS: { key: TransactionBuilderStep; label: string }[] = [
  { key: 'inputs', label: 'Inputs' },
  { key: 'outputs', label: 'Outputs' },
  { key: 'multisig', label: 'Multisig' },
  { key: 'review', label: 'Review' },
];

export function StepIndicator({ currentStep, skipMultisig = false }: StepIndicatorProps) {
  const steps = skipMultisig
    ? ALL_STEPS.filter((s) => s.key !== 'multisig')
    : ALL_STEPS;
  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <button
            key={step.key}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-all',
              isCurrent && 'bg-[var(--color-accent)] text-[var(--color-bg)]',
              isCompleted && 'bg-tertiary text-accent',
              !isCompleted && !isCurrent && 'bg-tertiary text-muted'
            )}
          >
            {step.label}
          </button>
        );
      })}
    </div>
  );
}
