import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CHART_TYPES } from './chart-series';
import { useChartType } from './chart-type.store';

/** Chart-type menu in the toolbar: Candles / Bars (OHLC) / Line / Area. */
export function ChartTypeMenu() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const type = useChartType((s) => s.type);
  const setType = useChartType((s) => s.setType);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        data-testid="chart-type-menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('chart.type.label')}
        title={t('chart.type.label')}
        onClick={() => setOpen((o) => !o)}
        className={`h-7 rounded-chip px-2 text-row font-medium ${open ? 'bg-surface-3 text-text' : 'text-text-muted hover:bg-surface-2'}`}
      >
        {t(`chart.type.${type}`)}
      </button>
      {open && (
        <ul role="menu" aria-label={t('chart.type.label')} className="absolute left-0 top-9 z-30 flex w-36 flex-col rounded-card border border-border bg-surface py-1">
          {CHART_TYPES.map((id) => (
            <li key={id} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={type === id}
                data-testid={`chart-type-${id}`}
                onClick={() => {
                  setType(id);
                  setOpen(false);
                }}
                className={`w-full px-3 py-1.5 text-left text-body hover:bg-surface-3 ${type === id ? 'text-text' : 'text-text-muted'}`}
              >
                {t(`chart.type.${id}`)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
