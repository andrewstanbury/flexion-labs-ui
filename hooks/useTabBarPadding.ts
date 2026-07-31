import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsWide } from './useIsWide';
import { useTabBarHeightStore } from './useTabBarHeightStore';

// Bottom padding for scroll content so the last items clear the floating tab
// bar (and the home-indicator safe area). Inside the tab navigator this is the
// measured tab bar height; on screens without the tab bar (modals / pushed
// stacks where nothing has been measured) it falls back to the bottom
// safe-area inset. Add to every scrollable page's contentContainerStyle.paddingBottom.
//
// On wide screens the navigation moves to a left rail (see Sidebar), so there
// is no bottom bar to clear — we return just the safe-area inset to avoid a
// phantom gap below the content.
//
// The height comes from `useTabBarHeightStore`, which `shell/TabBar` populates
// via onLayout. It used to come from `BottomTabBarHeightContext` in
// @react-navigation/bottom-tabs — removed because expo-router dropped React
// Navigation in Expo SDK 56 (SDK 57's expo-router depends on
// `standard-navigation` and has no @react-navigation/* dependency). That import
// pulled an orphaned copy of the package into both apps and threw at module
// scope, taking down every screen that imports the design system.
export function useTabBarPadding(extra = 16): number {
  const tabBarHeight = useTabBarHeightStore((s) => s.height);
  const insets = useSafeAreaInsets();
  const isWide = useIsWide();
  const base = isWide ? insets.bottom : (tabBarHeight ?? insets.bottom);
  return base + extra;
}
