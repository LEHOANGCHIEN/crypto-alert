import type { InputHTMLAttributes } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  name: string;
  label: string;
  error?: string;
};

/** Labelled input with an inline error message (translated by the caller). */
export function FormField({ name, label, error, className = '', ...rest }: Props) {
  const errId = `${name}-error`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-meta font-medium text-text-muted">
        {label}
      </label>
      <input
        id={name}
        name={name}
        data-testid={`field-${name}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        className={`h-10 rounded-input border bg-surface-2 px-3 text-body text-text ${error ? 'border-danger' : 'border-border'} ${className}`}
        {...rest}
      />
      {error && (
        <p id={errId} data-testid={`error-${name}`} className="text-meta text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
