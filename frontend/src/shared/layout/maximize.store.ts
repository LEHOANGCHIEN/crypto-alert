import { create } from 'zustand';

/** The chart panel fills the window while true (CSS maximize, not the browser Fullscreen API). */
export const useMaximized = create<{ maximized: boolean; set: (v: boolean) => void }>((set) => ({
  maximized: false,
  set: (maximized) => set({ maximized }),
}));
