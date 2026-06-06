import { View, Switch, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { colors, layout, space } from '../tokens';
import { useScheme, useTheme } from '../UIProvider';
import { Text } from '../primitives/Text';

// ToggleRow — a labelled on/off setting: optional left icon, a title +
// subtitle, and a Switch. The track/thumb colors resolve from tokens so call
// sites never repeat the platform Switch color block. Mirrors ListItem's
// `leftIcon` convention for the optional leading icon.

export type ToggleRowProps = {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  leftIcon?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function ToggleRow({
  title,
  subtitle,
  value,
  onValueChange,
  leftIcon,
  style,
}: ToggleRowProps) {
  const scheme = useScheme();
  const t = useTheme();
  const trackOff = scheme === 'dark' ? colors.sand[800] : colors.sand[200];
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
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: trackOff, true: t.accent }}
        thumbColor={colors.white}
        accessibilityLabel={title}
      />
    </View>
  );
}
