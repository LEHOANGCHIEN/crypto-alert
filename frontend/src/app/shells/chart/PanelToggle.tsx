import { useTranslation } from 'react-i18next';
import type { Side } from '../../../shared/layout/layout';
import { useLayout } from '../../../shared/layout/layout.store';

const ICON = 'h-4 w-4';

/** Collapse button (inside a column header) — the chevron points toward the edge the column folds into. */
export function CollapseButton({ side }: { side: Side }) {
  const { t } = useTranslation();
  const setCollapsed = useLayout((s) => s.setCollapsed);
  return (
    <button
      type="button"
      data-testid={`panel-collapse-${side}`}
      aria-label={t(`layout.collapse.${side}`)}
      title={t(`layout.collapse.${side}`)}
      onClick={() => setCollapsed(side, true)}
      className="flex h-6 w-6 items-center justify-center rounded-chip text-text-muted hover:bg-surface-3 hover:text-text"
    >
      <svg aria-hidden="true" viewBox="0 0 16 16" className={ICON} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d={side === 'left' ? 'M10 3L5 8l5 5' : 'M6 3l5 5-5 5'} />
      </svg>
    </button>
  );
}

/** ≤ 24 px rail left at the window edge while a column is collapsed; the button reopens it at its previous width. */
export function Rail({ side }: { side: Side }) {
  const { t } = useTranslation();
  const setCollapsed = useLayout((s) => s.setCollapsed);
  return (
    <div
      data-testid={`panel-rail-${side}`}
      className={`hidden w-6 shrink-0 flex-col items-center bg-surface pt-2 lg:flex ${side === 'left' ? 'border-r' : 'border-l'} border-border`}
    >
      <button
        type="button"
        data-testid={`panel-expand-${side}`}
        aria-label={t(`layout.expand.${side}`)}
        title={t(`layout.expand.${side}`)}
        onClick={() => setCollapsed(side, false)}
        className="flex h-6 w-6 items-center justify-center rounded-chip text-text-muted hover:bg-surface-3 hover:text-text"
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" className={ICON} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d={side === 'left' ? 'M6 3l5 5-5 5' : 'M10 3L5 8l5 5'} />
        </svg>
      </button>
    </div>
  );
}
