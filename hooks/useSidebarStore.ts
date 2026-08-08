import { createPersistedStore } from './createPersistedStore';

// Collapsed/expanded state for the wide-screen left navigation rail, persisted
// so a user's choice survives reloads. Mirrors useThemeStore's shape/pattern.
// Default is collapsed (icon-only) — the rail opens narrow and the user expands
// it to reveal labels.
interface SidebarStore {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

export const useSidebarStore = createPersistedStore<SidebarStore>('sidebar-collapsed', (set) => ({
  collapsed: true,
  toggle: () => set((s) => ({ collapsed: !s.collapsed })),
  setCollapsed: (collapsed) => set({ collapsed }),
}));
