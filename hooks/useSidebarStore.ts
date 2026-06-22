import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Collapsed/expanded state for the wide-screen left navigation rail, persisted
// so a user's choice survives reloads. Mirrors useThemeStore's shape/pattern.
// Default is collapsed (icon-only) — the rail opens narrow and the user expands
// it to reveal labels.
interface SidebarStore {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      collapsed: true,
      toggle: () => set((s) => ({ collapsed: !s.collapsed })),
      setCollapsed: (collapsed) => set({ collapsed }),
    }),
    {
      name: 'sidebar-collapsed',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
