/** Pure helpers for the dashboard column layout (localStorage `crypto-alert.layout`, decision ui-polish §8). */
export const LAYOUT_KEY = 'crypto-alert.layout';
export const KEY_STEP = 16;

export type Side = 'left' | 'right';
export type PanelState = { width: number; collapsed: boolean };
export type LayoutState = { left: PanelState; right: PanelState; bottom?: { height: number; collapsed: boolean } };

export const LIMITS: Record<Side, { min: number; max: number; def: number }> = {
  left: { min: 180, max: 480, def: 240 },
  right: { min: 260, max: 520, def: 320 },
};

export const clampWidth = (side: Side, width: number): number => Math.min(LIMITS[side].max, Math.max(LIMITS[side].min, Math.round(width)));

export const defaultLayout = (): LayoutState => ({
  left: { width: LIMITS.left.def, collapsed: false },
  right: { width: LIMITS.right.def, collapsed: false },
});

const panel = (side: Side, raw: unknown): PanelState => {
  const r = (raw ?? {}) as Partial<PanelState>;
  const w = typeof r.width === 'number' && Number.isFinite(r.width) ? clampWidth(side, r.width) : LIMITS[side].def;
  return { width: w, collapsed: r.collapsed === true };
};

/** Reads defensively: bad JSON or wrong shapes fall back to defaults; widths are clamped to the limits. */
export function parseLayout(json: string | null): LayoutState {
  if (!json) return defaultLayout();
  try {
    const raw = JSON.parse(json) as Partial<LayoutState> | null;
    if (!raw || typeof raw !== 'object') return defaultLayout();
    const out: LayoutState = { left: panel('left', raw.left), right: panel('right', raw.right) };
    if (raw.bottom && typeof raw.bottom === 'object') out.bottom = raw.bottom;
    return out;
  } catch {
    return defaultLayout();
  }
}

/** Width after a drag: below the minimum the drag is shown at the minimum and collapses on release. */
export function resolveDrag(side: Side, rawWidth: number): { width: number; collapse: boolean } {
  return { width: clampWidth(side, rawWidth), collapse: rawWidth < LIMITS[side].min };
}
