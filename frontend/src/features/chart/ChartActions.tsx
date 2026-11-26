import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormat } from '../../shared/format/useFormat';
import { useMaximized } from '../../shared/layout/maximize.store';
import { downloadCanvas, screenshotName } from './screenshot';

const ICON = 'h-4 w-4';
const BTN = 'flex h-7 w-7 items-center justify-center rounded-chip text-text-muted hover:bg-surface-3 hover:text-text';

/** Toolbar buttons: save a PNG of the chart (`takeScreenshot`) and maximize/restore the chart panel (Esc restores). */
export function ChartActions({ symbol, interval, screenshot }: { symbol: string; interval: string; screenshot: () => HTMLCanvasElement | null }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const maximized = useMaximized((s) => s.maximized);
  const setMaximized = useMaximized((s) => s.set);

  useEffect(() => {
    if (!maximized) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMaximized(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [maximized, setMaximized]);
  // Leaving the page must not leave the next page maximized.
  useEffect(() => () => setMaximized(false), [setMaximized]);

  const save = () => {
    const canvas = screenshot();
    if (canvas) downloadCanvas(canvas, screenshotName(symbol, interval, fmt.fileStamp(Date.now())));
  };

  return (
    <div className="ml-auto flex items-center gap-1">
      <button type="button" data-testid="chart-screenshot" aria-label={t('chart.screenshot')} title={t('chart.screenshot')} onClick={save} className={BTN}>
        <svg aria-hidden="true" viewBox="0 0 16 16" className={ICON} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 5.5h2.2L5.4 4h5.2l1.2 1.5H14v7H2z" />
          <circle cx="8" cy="8.7" r="2.2" />
        </svg>
      </button>
      <button
        type="button"
        data-testid="chart-maximize"
        aria-pressed={maximized}
        aria-label={maximized ? t('chart.restore') : t('chart.maximize')}
        title={maximized ? t('chart.restore') : t('chart.maximize')}
        onClick={() => setMaximized(!maximized)}
        className={BTN}
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" className={ICON} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d={maximized ? 'M6 2v4H2M10 14v-4h4M14 6h-4V2M2 10h4v4' : 'M2 6V2h4M14 10v4h-4M10 2h4v4M6 14H2v-4'} />
        </svg>
      </button>
    </div>
  );
}
