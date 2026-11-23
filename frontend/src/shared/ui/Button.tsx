import type { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' };

export function Button({ variant = 'primary', className = '', type = 'button', ...rest }: Props) {
  const style = variant === 'primary' ? 'bg-accent text-bg' : 'bg-surface-2 text-text border border-border';
  return <button type={type} className={`h-10 rounded-button px-4 text-body font-medium disabled:opacity-60 ${style} ${className}`} {...rest} />;
}
