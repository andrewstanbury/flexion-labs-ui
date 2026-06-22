import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { space, radius } from '../tokens';
import { useTheme } from '../UIProvider';
import { useSidebarStore } from '../hooks/useSidebarStore';
import { Pressable } from '../primitives/Pressable';
import { Text } from '../primitives/Text';
import type { TabBarProps } from './TabBar';

// Sidebar — the wide-screen (tablet / desktop web) counterpart to TabBar. It
// takes the SAME { state, navigation, tabs } props as TabBar so a layout can
// swap one for the other based on screen width with no other changes. Renders
// a vertical rail that collapses to icons-only (state persisted via
// useSidebarStore). The Settings destination is pinned to the bottom; every
// other tab stacks under the brand header in route order.

const EXPANDED_WIDTH = 220;
const COLLAPSED_WIDTH = 64;
const ITEM_SIZE = 44; // square hit target when collapsed; row height when expanded

type SidebarProps = TabBarProps & {
  // Wordmark shown in the header when expanded. Hidden when collapsed.
  brand?: string;
};

// Destinations pinned to the bottom of the rail rather than stacked at the top.
const isFooterRoute = (name: string) => name.startsWith('settings');

export function Sidebar({ state, navigation, tabs, brand = 'Flexion' }: SidebarProps) {
  const insets = useSafeAreaInsets();
  const t = useTheme();
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggle = useSidebarStore((s) => s.toggle);

  const renderItem = (route: { key: string; name: string }, index: number) => {
    const cfg = tabs[route.name];
    if (!cfg) return null;
    const focused = state.index === index;
    const color = focused ? t.accentStrong : t.textMuted;

    return (
      <Pressable.Touch
        key={route.key}
        accessibilityRole="tab"
        accessibilityLabel={cfg.label}
        accessibilityState={{ selected: focused }}
        style={[
          styles.item,
          collapsed && styles.itemCollapsed,
          focused && { backgroundColor: t.accentMuted },
        ]}
        onPress={() => {
          const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
        }}
      >
        <Ionicons name={focused ? cfg.active : cfg.inactive} size={22} color={color} />
        {!collapsed && (
          <Text variant="label" style={{ color, fontWeight: focused ? '600' : '500' }}>
            {cfg.label}
          </Text>
        )}
      </Pressable.Touch>
    );
  };

  const topRoutes = state.routes.filter((r) => !isFooterRoute(r.name));
  const footerRoutes = state.routes.filter((r) => isFooterRoute(r.name));

  return (
    <View
      style={[
        styles.rail,
        {
          width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
          backgroundColor: t.surfaceElevated,
          borderRightColor: t.border,
          paddingTop: insets.top + space[3],
          paddingBottom: Math.max(insets.bottom, space[3]),
        },
      ]}
    >
      <View style={[styles.header, collapsed && styles.headerCollapsed]}>
        {!collapsed && (
          <Text variant="h3" style={{ color: t.textPrimary }}>
            {brand}
          </Text>
        )}
        <Pressable.Touch
          accessibilityRole="button"
          accessibilityLabel={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          style={styles.toggle}
          onPress={toggle}
        >
          <Ionicons
            name={collapsed ? 'chevron-forward' : 'chevron-back'}
            size={20}
            color={t.textMuted}
          />
        </Pressable.Touch>
      </View>

      <View style={styles.group}>
        {topRoutes.map((route) => renderItem(route, state.routes.indexOf(route)))}
      </View>

      <View style={styles.spacer} />

      <View style={styles.group}>
        {footerRoutes.map((route) => renderItem(route, state.routes.indexOf(route)))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    flexDirection: 'column',
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space[2],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[2],
    marginBottom: space[4],
  },
  headerCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  toggle: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  group: {
    gap: space[1],
  },
  spacer: {
    flex: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    height: ITEM_SIZE,
    paddingHorizontal: space[3],
    borderRadius: radius.md,
  },
  itemCollapsed: {
    width: ITEM_SIZE,
    paddingHorizontal: 0,
    justifyContent: 'center',
    alignSelf: 'center',
  },
});
