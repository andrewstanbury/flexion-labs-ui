import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Whether to surface build/runtime detail in the UI — currently which backend
// the app is talking to, shown in the sync status row.
//
// A user preference, not a build flag. The apps already gate *availability*
// behind __DEV__ / Expo Go (see each app's lib/devFlags.ts); this decides
// whether an operator who has that availability actually wants the detail on
// screen right now. Two separate questions, so two separate mechanisms —
// collapsing them would mean either a permanent debug pill in dev or no way to
// check without a rebuild.
//
// Default OFF: it is diagnostic chrome, and a badge that is always there stops
// being noticed.
interface DevModeStore {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  toggle: () => void;
}

export const useDevModeStore = create<DevModeStore>()(
  persist(
    (set) => ({
      enabled: false,
      setEnabled: (enabled) => set({ enabled }),
      toggle: () => set((s) => ({ enabled: !s.enabled })),
    }),
    {
      name: 'dev-mode-preference',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
