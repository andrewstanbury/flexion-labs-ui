import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, type ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { space } from '../tokens';
import { useTheme } from '../UIProvider';
import { Pressable } from '../primitives/Pressable';
import { Text } from '../primitives/Text';
import { useTabBarHeightStore } from '../hooks/useTabBarHeightStore';

// TabBar — design-system replacement for the inline CustomTabBar in
// (app)/_layout.tsx. Driven by a config map keyed on route name so layouts
// pass screens through expo-router's tabBar prop without rebuilding the
// styling each time. Accepts the same props expo-router gives a custom
// tabBar (state, navigation).

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

export type TabConfig = {
  active:   IoniconsName;
  inactive: IoniconsName;
  label:    string;
};

export type TabBarProps = {
  state: { index: number; routes: Array<{ key: string; name: string }> };
  navigation: {
    emit: (e: { type: string; target: string; canPreventDefault: boolean }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
  tabs: Record<string, TabConfig>;
};

export function TabBar({ state, navigation, tabs }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const t = useTheme();
  const setTabBarHeight = useTabBarHeightStore((s) => s.setHeight);

  // Publish the bar's real height so useTabBarPadding can keep scroll content
  // clear of it. Measured rather than derived from the styles below, so it stays
  // right when the OS font scale or the bottom inset changes. Cleared on unmount
  // so screens outside the tab navigator fall back to the safe-area inset
  // instead of padding for a bar that is no longer on screen.
  useEffect(() => () => setTabBarHeight(null), [setTabBarHeight]);

  return (
    <View
      onLayout={(e) => setTabBarHeight(e.nativeEvent.layout.height)}
      style={[
        styles.bar,
        {
          backgroundColor: t.surfaceElevated,
          borderTopColor: t.border,
          paddingBottom: Math.max(insets.bottom, space[2]),
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const cfg = tabs[route.name];
        if (!cfg) return null;
        const focused = state.index === index;
        const color = focused ? t.accentStrong : t.textMuted;

        return (
          <Pressable.Touch
            key={route.key}
            style={styles.tab}
            onPress={() => {
              const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
            }}
          >
            <View style={styles.pill}>
              <Ionicons name={focused ? cfg.active : cfg.inactive} size={22} color={color} />
            </View>
            <Text
              variant="label"
              style={{ color, fontWeight: focused ? '600' : '500' }}
            >
              {cfg.label}
            </Text>
          </Pressable.Touch>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: space[3],
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: space[1],
  },
  pill: {
    width: 44,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
