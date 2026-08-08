import { View } from 'react-native';
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { space } from '../tokens';
import { Pressable } from '../primitives/Pressable';
import { Icon } from '../primitives/Icon';
import { useTheme } from '../UIProvider';
import { IconBubble } from './IconBubble';
import { ToggleRow } from './ToggleRow';
import type { NavOrderState } from '../hooks/useNavOrderStore';

export interface NavSectionTab<K extends string> {
  key: K;
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
}

// Real, always-on customization for the bottom nav bar's tab order and
// visibility — arrow buttons move a tab up/down (no drag gesture: this
// package deliberately has no reanimated dependency), a switch shows/hides
// it. A tab in `alwaysVisible` still reorders freely but its switch always
// bounces back — `toggleTab` itself refuses the change (see
// createNavOrderStore), this just explains why in the subtitle rather than
// leaving an unexplained non-moving switch.
export function NavigationSection<K extends string>({
  tabs,
  alwaysVisible,
  order,
  hidden,
  toggleTab,
  moveTab,
  reset,
  resetLabel = 'Show all tabs',
  resetSubtitle = 'Restore the default order and visibility',
  protectedSubtitle = 'Always visible',
  lastVisibleSubtitle = 'Keep at least one tab visible',
  testID,
}: {
  tabs: NavSectionTab<K>[];
  alwaysVisible: readonly K[];
  order: K[];
  hidden: Partial<Record<K, boolean>>;
  toggleTab: NavOrderState<K>['toggleTab'];
  moveTab: NavOrderState<K>['moveTab'];
  reset: () => void;
  resetLabel?: string;
  resetSubtitle?: string;
  protectedSubtitle?: string;
  lastVisibleSubtitle?: string;
  testID?: string;
}) {
  const t = useTheme();
  const byKey = new Map(tabs.map((tab) => [tab.key, tab]));
  const orderedTabs = order.map((key) => byKey.get(key)).filter((tab): tab is NavSectionTab<K> => !!tab);
  const visibleCount = tabs.filter((tab) => !hidden[tab.key]).length;
  const allVisible = tabs.every((tab) => !hidden[tab.key]);
  const defaultOrderKeys = tabs.map((tab) => tab.key).join('|');
  const isDefaultOrder = order.join('|') === defaultOrderKeys;

  return (
    <View>
      {orderedTabs.map((tab, index) => {
        const isProtected = alwaysVisible.includes(tab.key);
        const isLastVisible = !isProtected && visibleCount <= 1 && !hidden[tab.key];
        const subtitle = isProtected ? protectedSubtitle : isLastVisible ? lastVisibleSubtitle : undefined;
        return (
          <View
            key={tab.key}
            testID={testID ? `${testID}-row-${tab.key}` : undefined}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.px * 3, paddingVertical: space.px * 2 }}
          >
            <View>
              <Pressable.Touch
                onPress={() => moveTab(tab.key, 'up')}
                disabled={index === 0}
                accessibilityRole="button"
                accessibilityLabel={`Move ${tab.label} up`}
                style={{ opacity: index === 0 ? 0.3 : 1, padding: space.px }}
              >
                <Icon name="chevron-up" size="sm" color="secondary" />
              </Pressable.Touch>
              <Pressable.Touch
                onPress={() => moveTab(tab.key, 'down')}
                disabled={index === orderedTabs.length - 1}
                accessibilityRole="button"
                accessibilityLabel={`Move ${tab.label} down`}
                style={{ opacity: index === orderedTabs.length - 1 ? 0.3 : 1, padding: space.px }}
              >
                <Icon name="chevron-down" size="sm" color="secondary" />
              </Pressable.Touch>
            </View>
            <View style={{ flex: 1 }}>
              <ToggleRow
                leftIcon={<IconBubble name={tab.icon} color={t.accentStrong} />}
                title={tab.label}
                subtitle={subtitle}
                value={!hidden[tab.key]}
                onValueChange={() => toggleTab(tab.key)}
              />
            </View>
          </View>
        );
      })}
      <View style={{ marginTop: space.px * 2 }}>
        <ToggleRow
          title={resetLabel}
          subtitle={resetSubtitle}
          value={allVisible && isDefaultOrder}
          onValueChange={reset}
        />
      </View>
    </View>
  );
}
