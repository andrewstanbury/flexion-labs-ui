import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { layout, radius, space } from '../tokens';
import { useTheme } from '../UIProvider';
import { Pressable } from '../primitives/Pressable';
import { Text } from '../primitives/Text';

// FilterChips — a horizontally scrolling row of pill filters, each with an
// optional count ("All 42", "Needs you 37"). The selected chip is filled with
// the accent; the rest are raised white pills with a hairline and a soft base
// edge, the same physical language as Button. Single-select: for a fixed set
// of 2–4 equal-width options SegmentedControl reads better.
export type FilterChip<K extends string> = {
  key: K;
  label: string;
  count?: number;
};

export type FilterChipsProps<K extends string> = {
  chips: readonly FilterChip<K>[];
  selected: K;
  onSelect: (key: K) => void;
  style?: StyleProp<ViewStyle>;
};

const EDGE = 2;

export function FilterChips<K extends string>({ chips, selected, onSelect, style }: FilterChipsProps<K>) {
  const t = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // Neither grow nor shrink: a horizontal ScrollView otherwise fills the
      // column it sits in, or collapses to nothing once growth is turned off.
      style={[{ flexGrow: 0, flexShrink: 0 }, style]}
      contentContainerStyle={{ gap: space[2], paddingVertical: EDGE }}
      accessibilityRole="tablist"
    >
      {chips.map((chip) => {
        const on = chip.key === selected;
        const label = chip.count === undefined ? chip.label : `${chip.label} ${chip.count}`;
        return (
          <Pressable.Touch
            key={chip.key}
            onPress={() => onSelect(chip.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={label}
          >
            <View
              style={{
                borderRadius: radius.pill,
                paddingBottom: EDGE,
                backgroundColor: on ? t.accentEdge : t.border,
              }}
            >
              <View
                style={{
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: on ? t.accentBorder : t.border,
                  backgroundColor: on ? t.accentSurface : t.surfaceElevated,
                  paddingHorizontal: layout.gapLg,
                  paddingVertical: space[2],
                }}
              >
                <Text variant="bodyStrong" style={{ color: on ? t.accentOn : t.textPrimary }}>
                  {label}
                </Text>
              </View>
            </View>
          </Pressable.Touch>
        );
      })}
    </ScrollView>
  );
}
