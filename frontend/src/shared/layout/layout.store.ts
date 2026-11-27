import { create } from 'zustand';
import { BOTTOM, clampWidth, defaultBottom, defaultLayout, LAYOUT_KEY, LIMITS, parseLayout, type LayoutState, type Side } from './layout';

type LayoutActions = {
  setWidth: (side: Side, width: number) => void;
  setCollapsed: (side: Side, collapsed: boolean) => void;
  resetWidth: (side: Side) => void;
  setBottomHeight: (height: number) => void;
  setBottomCollapsed: (collapsed: boolean) => void;
  resetBottom: () => void;
};

function load(): LayoutState {
  try {
    return parseLayout(localStorage.getItem(LAYOUT_KEY));
  } catch {
    return defaultLayout();
  }
}

export const useLayout = create<LayoutState & LayoutActions>((set) => ({
  ...load(),
  setWidth: (side, width) => set((s) => ({ [side]: { ...s[side], width: clampWidth(side, width) } })),
  setCollapsed: (side, collapsed) => set((s) => ({ [side]: { ...s[side], collapsed } })),
  resetWidth: (side) => set((s) => ({ [side]: { ...s[side], width: LIMITS[side].def, collapsed: false } })),
  // The upper limit (60 % of the center column) depends on the window, so callers clamp it; the store keeps the minimum.
  setBottomHeight: (height) => set((s) => ({ bottom: { ...(s.bottom ?? defaultBottom()), height: Math.max(BOTTOM.min, Math.round(height)) } })),
  setBottomCollapsed: (collapsed) => set((s) => ({ bottom: { ...(s.bottom ?? defaultBottom()), collapsed } })),
  resetBottom: () => set({ bottom: defaultBottom() }),
}));

useLayout.subscribe((s) => {
  try {
    const { left, right, bottom } = s;
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(bottom ? { left, right, bottom } : { left, right }));
  } catch {
    /* storage unavailable: layout just is not remembered */
  }
});
