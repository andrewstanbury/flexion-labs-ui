import type { ComponentProps } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, space, typography } from '../tokens';
import { useTheme } from '../UIProvider';
import { Text } from '../primitives/Text';

// Tag — a small tinted status label ("PLAN", "New", "Needs review"). Tinted
// face with matching text, no border: it labels a thing rather than being
// something to tap. For a tappable/selectable pill use FilterChips.
export type TagTone =
  | 'neutral' | 'accent' | 'highlight' | 'energy' | 'danger'
  | 'info' | 'success' | 'warning';

export type TagProps = {
  label: string;
  tone?: TagTone;
  /** Leading Ionicons glyph, e.g. "time-outline" for "Waiting since today". */
  icon?: ComponentProps<typeof Ionicons>['name'];
  /** Sentence case instead of the default uppercase label style. */
  quiet?: boolean;
  style?: StyleProp<ViewStyle>;
};

function useToneColors(tone: TagTone) {
  const t = useTheme();
  switch (tone) {
    case 'neutral':   return { bg: t.surfaceMuted, fg: t.textSecondary };
    case 'accent':    return { bg: t.accentMuted, fg: t.accentStrong };
    case 'highlight': return { bg: t.highlightSurface, fg: t.highlightOn };
    case 'energy':    return { bg: t.surfaceMuted, fg: t.energyStrong };
    case 'danger':    return { bg: t.dangerMuted, fg: t.danger };
    case 'info':      return { bg: t.infoMuted, fg: t.info };
    case 'success':   return { bg: t.successMuted, fg: t.success };
    case 'warning':   return { bg: t.warningMuted, fg: t.warning };
  }
}

export function Tag({ label, tone = 'neutral', icon, quiet = false, style }: TagProps) {
  const c = useToneColors(tone);
  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          backgroundColor: c.bg,
          borderRadius: radius.sm,
          paddingHorizontal: space[2],
          paddingVertical: 3,
        },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={12} color={c.fg} /> : null}
      <Text
        style={
          quiet
            ? { ...typography.captionStrong, color: c.fg }
            : { ...typography.label, color: c.fg, textTransform: 'uppercase' }
        }
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

// Badge — retaskable's name for the same thing, in its quiet sentence-case
// form. `<Badge tone="info">Waiting</Badge>` reads naturally inline.
export function Badge({
  children,
  tone = 'neutral',
  icon,
  style,
}: { children: string; tone?: TagTone; icon?: TagProps['icon']; style?: StyleProp<ViewStyle> }) {
  return <Tag label={children} tone={tone} icon={icon} quiet style={style} />;
}
