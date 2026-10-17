import { View, type StyleProp, type ViewStyle } from 'react-native';
import { radius, space, typography } from '../tokens';
import { useTheme } from '../UIProvider';
import { Text } from '../primitives/Text';

// Tag — a small tinted status label ("PLAN", "New", "Needs review"). Tinted
// face with matching text, no border: it labels a thing rather than being
// something to tap. For a tappable/selectable pill use FilterChips.
export type TagTone = 'neutral' | 'accent' | 'highlight' | 'energy' | 'danger';

export type TagProps = {
  label: string;
  tone?: TagTone;
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
  }
}

export function Tag({ label, tone = 'neutral', style }: TagProps) {
  const c = useToneColors(tone);
  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          backgroundColor: c.bg,
          borderRadius: radius.sm,
          paddingHorizontal: space[2],
          paddingVertical: 3,
        },
        style,
      ]}
    >
      <Text
        style={{ ...typography.label, color: c.fg, textTransform: 'uppercase' }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}
