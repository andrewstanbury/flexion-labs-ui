import { View } from 'react-native';
import { layout, space } from '../tokens';
import { Text } from '../primitives/Text';

// SectionHeader — small uppercase label for a settings/list section.
// Optional trailing element (button, count badge).

export type SectionHeaderProps = {
  title: string;
  trailing?: React.ReactNode;
};

export function SectionHeader({ title, trailing }: SectionHeaderProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: space[2],
        marginTop: layout.gapLg,
        marginBottom: layout.gapSm,
      }}
    >
      {/* The website's eyebrow: accent-coloured, widely tracked uppercase. */}
      <Text variant="label" color="accent" style={{ textTransform: 'uppercase', letterSpacing: 1.2 }}>
        {title}
      </Text>
      {trailing}
    </View>
  );
}
