import { create } from "zustand";

type PromptState = { open: boolean; show: () => void; hide: () => void };

/** "Log in to use watchlist" prompt shown to guests who click a star (AC-WL-06). */
export const useWatchlistPrompt = create<PromptState>((set) => ({
  open: false,
  show: () => set({ open: true }),
  hide: () => set({ open: false }),
}));
