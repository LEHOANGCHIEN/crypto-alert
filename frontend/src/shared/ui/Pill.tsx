import type { ReactNode } from 'react';

/** Pill tab: active = filled (ARCHITECTURE §11.3). Use inside `role="tablist"`. */
export function Pill({ active, onClick, children, testId }: { active: boolean; onClick: () => void; children: ReactNode; testId?: string }) {
  return (
    <button
      type="button"
      role="tab"
      data-testid={testId}
      aria-selected={active}
      onClick={onClick}
      className={`h-8 rounded-full border px-4 text-body font-medium ${
        active ? 'border-text bg-text text-bg' : 'border-border text-text-muted hover:bg-surface-2'
      }`}
    >
      {children}
    </button>
  );
}
