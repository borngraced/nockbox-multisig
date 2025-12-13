import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, label, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm text-secondary">
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          className={cn(
            'input-field flex h-10 w-full px-3 py-2 text-sm',
            error && 'border-[var(--color-error)] focus:border-[var(--color-error)]',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
