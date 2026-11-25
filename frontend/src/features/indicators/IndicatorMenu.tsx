import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MACD_FAST, MACD_SIGNAL, MACD_SLOW, RSI_PERIOD } from './lib';
import { parsePeriod, PERIOD_MAX, PERIOD_MIN } from './settings';
import { useIndicatorSettings } from './useIndicatorSettings';

const MA_CLASS = ['text-ind-1', 'text-ind-2', 'text-ind-3'];

/** One MA slot: show/hide + period input applied on Enter/blur; an invalid period shows an error and keeps the old one. */
function MaRow({ slot }: { slot: number }) {
  const { t } = useTranslation();
  const ma = useIndicatorSettings((s) => s.settings.ma[slot]);
  const setEnabled = useIndicatorSettings((s) => s.setMaEnabled);
  const setPeriod = useIndicatorSettings((s) => s.setMaPeriod);
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const n = slot + 1;
  const id = `ind-ma-${n}`;

  const commit = () => {
    if (draft === null || draft === String(ma.period)) return setDraft(null);
    const period = parsePeriod(draft);
    setDraft(null);
    setInvalid(period === null);
    if (period !== null) setPeriod(slot, period);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <input
          id={`${id}-toggle`}
          data-testid={`${id}-toggle`}
          type="checkbox"
          checked={ma.enabled}
          onChange={(e) => setEnabled(slot, e.target.checked)}
          className="size-4 accent-accent"
        />
        <label htmlFor={`${id}-toggle`} className={`w-20 text-body font-medium ${MA_CLASS[slot]}`}>
          {t('indicators.maSlot', { n })}
        </label>
        <input
          data-testid={`${id}-period`}
          aria-label={t('indicators.period', { n })}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${id}-error` : undefined}
          inputMode="numeric"
          value={draft ?? String(ma.period)}
          onChange={(e) => {
            setDraft(e.target.value);
            setInvalid(false);
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
          }}
          className={`h-8 w-20 rounded-input border bg-surface-2 px-2 text-body text-text tabular-nums ${invalid ? 'border-danger' : 'border-border'}`}
        />
      </div>
      {invalid && (
        <p id={`${id}-error`} data-testid={`${id}-error`} role="alert" className="text-meta text-danger">
          {t('indicators.periodError', { min: PERIOD_MIN, max: PERIOD_MAX })}
        </p>
      )}
    </div>
  );
}

function Toggle({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input id={id} data-testid={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-accent" />
      <label htmlFor={id} className="text-body font-medium text-text">
        {label}
      </label>
    </div>
  );
}

/** "Indicators" button + popover: MA 1–3 (toggle, period 2–200), RSI and MACD panes. Settings saved per browser. */
export function IndicatorMenu() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const settings = useIndicatorSettings((s) => s.settings);
  const setRsi = useIndicatorSettings((s) => s.setRsi);
  const setMacd = useIndicatorSettings((s) => s.setMacd);
  const setVolume = useIndicatorSettings((s) => s.setVolume);

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
        data-testid="indicators-button"
        aria-expanded={open}
        aria-controls="indicators-menu"
        onClick={() => setOpen((o) => !o)}
        className={`h-7 rounded-chip px-2 text-row font-medium ${open ? 'bg-surface-3 text-text' : 'text-text-muted hover:bg-surface-2'}`}
      >
        {t('indicators.button')}
      </button>
      {open && (
        <div
          id="indicators-menu"
          data-testid="indicators-menu"
          role="dialog"
          aria-label={t('indicators.title')}
          className="absolute right-0 top-10 z-30 flex w-72 flex-col gap-3 rounded-card border border-border bg-surface p-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-section font-semibold">{t('indicators.title')}</h2>
            <button
              type="button"
              data-testid="indicators-close"
              aria-label={t('indicators.close')}
              onClick={() => setOpen(false)}
              className="h-8 rounded-button px-2 text-text-muted"
            >
              {'×'}
            </button>
          </div>
          {settings.ma.map((_, i) => (
            <MaRow key={i} slot={i} />
          ))}
          <Toggle id="ind-volume-toggle" label={t('indicators.volume')} checked={settings.volume} onChange={setVolume} />
          <Toggle id="ind-rsi-toggle" label={t('indicators.rsi', { period: RSI_PERIOD })} checked={settings.rsi} onChange={setRsi} />
          <Toggle
            id="ind-macd-toggle"
            label={t('indicators.macd', { fast: MACD_FAST, slow: MACD_SLOW, signal: MACD_SIGNAL })}
            checked={settings.macd}
            onChange={setMacd}
          />
        </div>
      )}
    </div>
  );
}
