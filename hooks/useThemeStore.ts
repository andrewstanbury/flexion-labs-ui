import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Shared theme preference, persisted per app under the same key. Both the
// patient and practitioner apps drive light/dark/system from this store.
type ThemePreference = 'system' | 'dark' | 'light';

interface ThemeStore {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'theme-preference',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
