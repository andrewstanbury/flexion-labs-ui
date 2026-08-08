import { createPersistedStore } from './createPersistedStore';

// Shared theme preference, persisted per app under the same key. Both the
// patient and practitioner apps drive light/dark/system from this store.
type ThemePreference = 'system' | 'dark' | 'light';

interface ThemeStore {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

export const useThemeStore = createPersistedStore<ThemeStore>('theme-preference', (set) => ({
  theme: 'system',
  setTheme: (theme) => set({ theme }),
}));
