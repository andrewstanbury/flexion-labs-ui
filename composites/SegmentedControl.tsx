import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, space } from '../tokens';
import { useScheme, useTheme } from '../UIProvider';
import { Pressable } from '../primitives/Pressable';
import { Text } from '../primitives/Text';
import { Icon } from '../primitives/Icon';

// SegmentedControl — a row of mutually-exclusive pill options, one active.
// Used for the Theme and Language pickers in Settings. Each option may carry
// an icon (stacked above the label) or be label-only.

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  icon?: IoniconsName;
};

export type SegmentedControlProps<T extends string> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  const scheme = useScheme();
  const t = useTheme();
  const surface = scheme === 'dark' ? colors.sand[800] : colors.white;
  const inactiveIcon = scheme === 'dark' ? colors.sand[300] : colors.sand[700];
  return (
    <View
      accessibilityRole="radiogroup"
      style={[
        {
          flexDirection: 'row',
          gap: space[1],
          backgroundColor: surface,
          borderRadius: radius.card,
          padding: space[2],
        },
        style,
      ]}
    >
      {options.map(({ value: optionValue, label, icon }) => {
        const active = value === optionValue;
        return (
          <Pressable.Scale
            key={optionValue}
            onPress={() => onChange(optionValue)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={label}
            style={{
              flex: 1,
              paddingVertical: space[3],
              borderRadius: radius.lg,
              alignItems: 'center',
              backgroundColor: active ? t.accentSurface : colors.transparent,
            }}
          >
            {icon ? (
              <Icon name={icon} size={18} color={active ? t.accentOn : inactiveIcon} />
            ) : null}
            <Text
              variant={icon ? 'caption' : 'body'}
              color={active ? undefined : 'secondary'}
              style={{
                fontWeight: '600',
                ...(icon ? { marginTop: space[1] } : null),
                ...(active ? { color: t.accentOn } : null),
              }}
            >
              {label}
            </Text>
          </Pressable.Scale>
        );
      })}
    </View>
  );
}
