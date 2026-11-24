import { create } from 'zustand';

type ToastKind = 'success' | 'error' | 'info';
type ToastItem = { id: number; kind: ToastKind; text: string };

type ToastStore = { items: ToastItem[]; push: (kind: ToastKind, text: string) => void; dismiss: (id: number) => void };

let nextId = 1;
export const useToastStore = create<ToastStore>((set) => ({
  items: [],
  push: (kind, text) => {
    const id = nextId++;
    set((s) => ({ items: [...s.items, { id, kind, text }] }));
    setTimeout(() => set((s) => ({ items: s.items.filter((i) => i.id !== id) })), 5000);
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
}));

/** Callers pass already-translated text. */
export const toast = {
  success: (text: string) => useToastStore.getState().push('success', text),
  error: (text: string) => useToastStore.getState().push('error', text),
  info: (text: string) => useToastStore.getState().push('info', text),
};

const KIND_CLASS: Record<ToastKind, string> = {
  success: 'border-accent',
  info: 'border-accent',
  error: 'border-danger',
};

export function Toaster() {
  const items = useToastStore((s) => s.items);
  return (
    <div className="pointer-events-none fixed right-4 top-16 z-50 flex w-80 flex-col gap-2" aria-live="polite">
      {items.map((i) => (
        <div
          key={i.id}
          role={i.kind === 'error' ? 'alert' : 'status'}
          data-testid="toast"
          className={`pointer-events-auto rounded-card border bg-surface-2 p-3 text-body text-text ${KIND_CLASS[i.kind]}`}
        >
          {i.text}
        </div>
      ))}
    </div>
  );
}
