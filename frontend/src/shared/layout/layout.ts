/** Pure helpers for the dashboard column layout (localStorage `crypto-alert.layout`, decision ui-polish §8). */
export const LAYOUT_KEY = 'crypto-alert.layout';
export const KEY_STEP = 16;

export type Side = 'left' | 'right';
export type PanelState = { width: number; collapsed: boolean };
export type BottomState = { height: number; collapsed: boolean };
export type LayoutState = { left: PanelState; right: PanelState; bottom?: BottomState };

/** Bottom panel under the chart (AC-ALERT-11): min 120 px, max 60 % of the center column height. */
export const BOTTOM = { min: 120, def: 240, maxRatio: 0.6 } as const;

export const defaultBottom = (): BottomState => ({ height: BOTTOM.def, collapsed: false });

/** Highest allowed height for a center column of `centerHeight` px (never below the minimum). */
export const maxBottom = (centerHeight: number): number => Math.max(BOTTOM.min, Math.floor(centerHeight * BOTTOM.maxRatio));

/** Height after clamping to 120 px … 60 % of the center column. */
export const clampBottom = (height: number, centerHeight: number): number =>
  Math.min(maxBottom(centerHeight), Math.max(BOTTOM.min, Math.round(height)));

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
    if (raw.bottom && typeof raw.bottom === 'object') {
      const b = raw.bottom as Partial<BottomState>;
      const h = typeof b.height === 'number' && Number.isFinite(b.height) ? Math.max(BOTTOM.min, Math.round(b.height)) : BOTTOM.def;
      out.bottom = { height: h, collapsed: b.collapsed === true };
    }
    return out;
  } catch {
    return defaultLayout();
  }
}

/** Width after a drag: below the minimum the drag is shown at the minimum and collapses on release. */
export function resolveDrag(side: Side, rawWidth: number): { width: number; collapse: boolean } {
  return { width: clampWidth(side, rawWidth), collapse: rawWidth < LIMITS[side].min };
}
