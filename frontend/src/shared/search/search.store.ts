import { create } from 'zustand';

type SearchState = {
  open: boolean;
  /** Text typed in the home hero field, handed over to the dialog (AC-SITE-01). */
  initialQuery: string;
  /** Element that opened the dialog: focus returns to it on close (AC-SITE-02). */
  trigger: HTMLElement | null;
  show: (trigger?: HTMLElement | null, initialQuery?: string) => void;
  hide: () => void;
};

export const useSearch = create<SearchState>((set) => ({
  open: false,
  initialQuery: '',
  trigger: null,
  show: (trigger = null, initialQuery = '') => set({ open: true, trigger, initialQuery }),
  hide: () => set({ open: false }),
}));
