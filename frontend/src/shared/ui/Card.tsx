import type { ReactNode } from 'react';

/** Site-page card: 16 px radius, 1 px border, no shadow (ARCHITECTURE §11.3). */
export function Card({ children, className = '', testId }: { children: ReactNode; className?: string; testId?: string }) {
  return (
    <div data-testid={testId} className={`rounded-site-card border border-border bg-surface ${className}`}>
      {children}
    </div>
  );
}
