import { type InputHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  ayuda?: string;
}

export const TextField = forwardRef<HTMLInputElement, Props>(
  ({ label, error, ayuda, className, id, ...resto }, ref) => {
    const inputId = id ?? resto.name;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="label">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'input',
            error && 'border-coral focus:border-coral focus:ring-coral',
            className,
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...resto}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-coral-light">
            {error}
          </p>
        )}
        {!error && ayuda && <p className="text-xs text-paper-dim">{ayuda}</p>}
      </div>
    );
  },
);
TextField.displayName = 'TextField';
