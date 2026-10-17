import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../UIProvider';

// IconTile — the soft rounded-square icon holder from flexionlabs.com's
// feature cards. `accent` is the sage tint, `highlight` the pink one. Use it
// to lead a card or feature row; IconBubble stays the round settings-row badge.
export type IconTileProps = {
  name: ComponentProps<typeof Ionicons>['name'];
  tone?: 'accent' | 'highlight';
  size?: 'md' | 'lg';
};

const DIMENSIONS = {
  md: { box: 40, icon: 20, corner: 12 },
  lg: { box: 52, icon: 24, corner: 16 },
} as const;

export function IconTile({ name, tone = 'accent', size = 'md' }: IconTileProps) {
  const t = useTheme();
  const d = DIMENSIONS[size];
  const bg = tone === 'accent' ? t.accentMuted : t.highlightSurface;
  const fg = tone === 'accent' ? t.accentStrong : t.highlightOn;
  return (
    <View
      style={{
        width: d.box,
        height: d.box,
        borderRadius: d.corner,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={name} size={d.icon} color={fg} />
    </View>
  );
}
