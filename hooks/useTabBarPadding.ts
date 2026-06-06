import { useContext } from 'react';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Bottom padding for scroll content so the last items clear the floating tab
// bar (and the home-indicator safe area). Inside the tab navigator this is the
// measured tab bar height; on screens without the tab bar (modals / pushed
// stacks where the context is absent) it falls back to the bottom safe-area
// inset. Add to every scrollable page's contentContainerStyle.paddingBottom.
export function useTabBarPadding(extra = 16): number {
  const tabBarHeight = useContext(BottomTabBarHeightContext);
  const insets = useSafeAreaInsets();
  return (tabBarHeight ?? insets.bottom) + extra;
}
