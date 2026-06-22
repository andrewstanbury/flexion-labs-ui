import { useContext } from 'react';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsWide } from './useIsWide';

// Bottom padding for scroll content so the last items clear the floating tab
// bar (and the home-indicator safe area). Inside the tab navigator this is the
// measured tab bar height; on screens without the tab bar (modals / pushed
// stacks where the context is absent) it falls back to the bottom safe-area
// inset. Add to every scrollable page's contentContainerStyle.paddingBottom.
//
// On wide screens the navigation moves to a left rail (see Sidebar), so there
// is no bottom bar to clear — we return just the safe-area inset to avoid a
// phantom gap below the content.
export function useTabBarPadding(extra = 16): number {
  const tabBarHeight = useContext(BottomTabBarHeightContext);
  const insets = useSafeAreaInsets();
  const isWide = useIsWide();
  const base = isWide ? insets.bottom : (tabBarHeight ?? insets.bottom);
  return base + extra;
}
