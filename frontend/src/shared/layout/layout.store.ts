import { create } from 'zustand';
import { clampWidth, defaultLayout, LAYOUT_KEY, LIMITS, parseLayout, type LayoutState, type Side } from './layout';

type LayoutActions = {
  setWidth: (side: Side, width: number) => void;
  setCollapsed: (side: Side, collapsed: boolean) => void;
  resetWidth: (side: Side) => void;
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
}));

useLayout.subscribe((s) => {
  try {
    const { left, right, bottom } = s;
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(bottom ? { left, right, bottom } : { left, right }));
  } catch {
    /* storage unavailable: layout just is not remembered */
  }
});
