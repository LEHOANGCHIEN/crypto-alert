import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { KEY_STEP, LIMITS, resolveDrag, type Side } from './layout';
import { useLayout } from './layout.store';

/**
 * Vertical splitter between a side column and the chart (desktop only).
 * Drag, ←/→ (16 px) and double-click (default width). Dragging below the minimum collapses the column on release.
 */
export function ResizeHandle({ side }: { side: Side }) {
  const { t } = useTranslation();
  const width = useLayout((s) => s[side].width);
  const setWidth = useLayout((s) => s.setWidth);
  const setCollapsed = useLayout((s) => s.setCollapsed);
  const resetWidth = useLayout((s) => s.resetWidth);
  const drag = useRef<{ x: number; width: number; raw: number } | null>(null);
  // Dragging right grows the left column and shrinks the right column.
  const sign = side === 'left' ? 1 : -1;

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, width, raw: width };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    d.raw = d.width + sign * (e.clientX - d.x);
    setWidth(side, resolveDrag(side, d.raw).width);
  };
  const end = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (resolveDrag(side, d.raw).collapse) setCollapsed(side, true);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    setWidth(side, width + sign * dir * KEY_STEP);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      tabIndex={0}
      data-testid={`panel-resize-${side}`}
      aria-label={t(`layout.resize.${side}`)}
      aria-valuenow={width}
      aria-valuemin={LIMITS[side].min}
      aria-valuemax={LIMITS[side].max}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onDoubleClick={() => resetWidth(side)}
      onKeyDown={onKeyDown}
      className="hidden w-1 shrink-0 cursor-col-resize touch-none bg-border hover:bg-accent focus-visible:bg-accent lg:block"
    />
  );
}
