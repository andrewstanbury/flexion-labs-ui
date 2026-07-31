import { create } from 'zustand';

// Measured height of the app's bottom tab bar, published by `shell/TabBar` and
// consumed by `useTabBarPadding` so scroll content can clear it.
//
// This replaces `BottomTabBarHeightContext` from @react-navigation/bottom-tabs.
// As of Expo SDK 56 expo-router no longer builds on React Navigation — SDK 57's
// expo-router depends on `standard-navigation` instead and has no
// @react-navigation/* dependency at all. The old context was therefore never
// populated: importing it also dragged an orphaned copy of
// @react-navigation/bottom-tabs into both apps, which threw at module scope and
// took the whole design system down with it.
//
// A store rather than a context, deliberately: the tab bar renders as a SIBLING
// of the screens, not an ancestor, so a provider mounted inside TabBar could
// never reach the scroll views that need the value. React Navigation solved
// this from inside the navigator; we have no navigator to hook into. The tab
// bar is a singleton per app, so a module-level value is accurate.
//
// Height is measured via onLayout rather than derived from the style constants,
// so it stays correct when the OS font scale or the bottom safe-area inset
// changes.
interface TabBarHeightStore {
  /** null until the bar has laid out, or when no bar is mounted (wide screens). */
  height: number | null;
  setHeight: (height: number | null) => void;
}

export const useTabBarHeightStore = create<TabBarHeightStore>((set) => ({
  height: null,
  setHeight: (height) => set({ height }),
}));
