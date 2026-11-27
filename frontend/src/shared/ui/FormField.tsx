import type { InputHTMLAttributes } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'size'> & {
  name: string;
  label: string;
  error?: string;
  /** `lg` = 46 px high input of the auth pages (AC-UI-10) */
  size?: 'md' | 'lg';
};

/** Labelled input with an inline error message (translated by the caller). */
export function FormField({ name, label, error, size = 'md', className = '', ...rest }: Props) {
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
        className={`${size === 'lg' ? 'h-input-lg text-section' : 'h-8 text-body'} rounded-input border bg-surface-2 px-3 text-text ${error ? 'border-danger' : 'border-border'} ${className}`}
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
