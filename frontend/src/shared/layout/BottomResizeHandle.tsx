import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { BOTTOM, KEY_STEP } from './layout';
import { useLayout } from './layout.store';

type Props = { height: number; max: number };

/**
 * Horizontal splitter between the chart and the bottom panel (desktop only).
 * Drag up = taller; ↑/↓ change the height by 16 px; double-click restores the default height.
 */
export function BottomResizeHandle({ height, max }: Props) {
  const { t } = useTranslation();
  const setHeight = useLayout((s) => s.setBottomHeight);
  const reset = useLayout((s) => s.resetBottom);
  const drag = useRef<{ y: number; height: number } | null>(null);
  const clamp = (h: number) => Math.min(max, Math.max(BOTTOM.min, Math.round(h)));

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y: e.clientY, height };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (d) setHeight(clamp(d.height - (e.clientY - d.y)));
  };
  const end = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    setHeight(clamp(height + (e.key === 'ArrowUp' ? KEY_STEP : -KEY_STEP)));
  };

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      tabIndex={0}
      data-testid="panel-resize-bottom"
      aria-label={t('layout.resize.bottom')}
      aria-valuenow={height}
      aria-valuemin={BOTTOM.min}
      aria-valuemax={max}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onDoubleClick={reset}
      onKeyDown={onKeyDown}
      className="hidden h-1 shrink-0 cursor-row-resize touch-none bg-border hover:bg-accent focus-visible:bg-accent lg:block"
    />
  );
}
