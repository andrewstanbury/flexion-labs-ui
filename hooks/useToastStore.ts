import { create } from 'zustand';

// Transient, app-wide status notifications ("toasts"). Unlike useThemeStore /
// useSidebarStore this is deliberately NOT persisted — toasts are momentary, so
// it uses the plain create() form with no AsyncStorage. Being a global store
// (not a provider) means any handler / mutation onSuccess can fire one with
// `useToast()('Saved', { variant: 'success' })` — no context wiring required.
// The visible host is <ToastViewport />, mounted once per app.

export type ToastVariant = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  durationMs: number;
}

export interface ToastOptions {
  variant?: ToastVariant;
  durationMs?: number;
}

// Errors linger a little longer than confirmations — they carry more to read
// and matter more if missed.
const DEFAULT_DURATION: Record<ToastVariant, number> = {
  success: 2800,
  info: 2800,
  error: 4500,
};

// At most this many on screen at once; older ones drop off so a burst can't
// bury the screen.
const MAX_VISIBLE = 3;

let counter = 0;

interface ToastStore {
  toasts: Toast[];
  show: (message: string, opts?: ToastOptions) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

export const useToastStore = create<ToastStore>()((set) => ({
  toasts: [],
  show: (message, opts = {}) => {
    const variant = opts.variant ?? 'info';
    counter += 1;
    const id = `toast-${counter}`;
    const durationMs = opts.durationMs ?? DEFAULT_DURATION[variant];
    set((s) => ({ toasts: [...s.toasts, { id, message, variant, durationMs }].slice(-MAX_VISIBLE) }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

// The common case is just firing a message; this returns the `show` fn so call
// sites read `const toast = useToast(); toast('Saved', { variant: 'success' })`.
export function useToast() {
  return useToastStore((s) => s.show);
}
