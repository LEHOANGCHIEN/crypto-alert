import { useTranslation } from 'react-i18next';
import { priceDirection } from '../../shared/format';
import { useFormat } from '../../shared/format/useFormat';
import { RANGES, type Range } from './lib/ranges';

const DIRECTION_CLASS = { up: 'text-up', down: 'text-down', flat: 'text-text-muted' } as const;

/** Seven performance tiles (AC-COIN-03); the selected one drives the chart range. */
export function PerformanceTiles({ changes, selected, onSelect }: { changes: Record<Range, number | null | undefined>; selected: Range; onSelect: (r: Range) => void }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  return (
    <div role="group" aria-label={t('coin.tiles.label')} className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      {RANGES.map((r) => {
        const change = changes[r];
        const dir = typeof change === 'number' ? priceDirection(change) : 'flat';
        return (
          <button
            key={r}
            type="button"
            data-testid={`coin-tile-${r}`}
            aria-pressed={selected === r}
            data-change={typeof change === 'number' ? change : ''}
            onClick={() => onSelect(r)}
            className={`flex flex-col gap-1 rounded-card border p-3 text-left ${selected === r ? 'border-accent bg-surface-3' : 'border-border bg-surface hover:bg-surface-2'}`}
          >
            <span className="text-body text-text-muted">{t(`coin.tiles.${r}`)}</span>
            <span data-testid={`coin-tile-value-${r}`} className={`font-mono text-section font-semibold ${DIRECTION_CLASS[dir]}`}>
              {typeof change === 'number' ? fmt.percent(change) : '—'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
