import type { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary'; size?: 'md' | 'lg' };

export function Button({ variant = 'primary', size = 'md', className = '', type = 'button', ...rest }: Props) {
  const style = variant === 'primary' ? 'bg-accent text-bg' : 'bg-surface-2 text-text border border-border';
  return <button type={type} className={`${size === 'lg' ? 'h-button-lg w-full text-section' : 'h-8 text-body'} rounded-button px-4 font-medium disabled:opacity-60 ${style} ${className}`} {...rest} />;
}
