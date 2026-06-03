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
      <Text variant="label" color="muted" style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
        {title}
      </Text>
      {trailing}
    </View>
  );
}
