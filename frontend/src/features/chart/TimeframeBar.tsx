import { useTranslation } from 'react-i18next';
import type { Interval } from '../../shared/api/types';

export const INTERVALS: Interval[] = ['1m', '5m', '15m', '1h', '4h', '1d'];
export const DEFAULT_INTERVAL: Interval = '1h';

export function parseInterval(value: string | null): Interval {
  return INTERVALS.includes(value as Interval) ? (value as Interval) : DEFAULT_INTERVAL;
}

export function TimeframeBar({ active, onChange }: { active: Interval; onChange: (i: Interval) => void }) {
  const { t } = useTranslation();
  return (
    <div role="group" aria-label={t('chart.timeframes')} className="flex gap-1">
      {INTERVALS.map((i) => (
        <button
          key={i}
          type="button"
          data-testid={`tf-${i}`}
          aria-pressed={active === i}
          onClick={() => onChange(i)}
          className={`h-8 rounded-button px-3 text-body font-medium ${active === i ? 'bg-accent text-bg' : 'bg-surface-2 text-text-muted'}`}
        >
          {i}
        </button>
      ))}
    </div>
  );
}
