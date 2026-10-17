import { View, Switch, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { colors, layout, space } from '../tokens';
import { useTheme } from '../UIProvider';
import { Text } from '../primitives/Text';
import { Tag } from './Tag';

// ToggleRow — a labelled on/off setting: optional left icon, a title +
// subtitle, and a Switch. The track/thumb colors resolve from tokens so call
// sites never repeat the platform Switch color block. Mirrors ListItem's
// `leftIcon` convention for the optional leading icon.

export type ToggleRowProps = {
  title: string;
  subtitle?: string;
  value: boolean;
  /** Omit (with `locked`) for a setting the user can see but not change. */
  onValueChange?: (value: boolean) => void;
  /** Shows the state as a small On/Off badge instead of a switch (v0.31.0). */
  locked?: boolean;
  leftIcon?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function ToggleRow({
  title,
  subtitle,
  value,
  onValueChange,
  locked = false,
  leftIcon,
  style,
}: ToggleRowProps) {
  const t = useTheme();
  const trackOff = t.border;
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', gap: layout.gapMd },
        style,
      ]}
    >
      {leftIcon}
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{title}</Text>
        {subtitle ? (
          <Text variant="caption" color="secondary" style={{ marginTop: space.px * 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {locked ? (
        <Tag label={value ? 'On' : 'Off'} tone="neutral" />
      ) : (
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: trackOff, true: t.accent }}
        thumbColor={colors.white}
        accessibilityLabel={title}
      />
      )}
    </View>
  );
}
