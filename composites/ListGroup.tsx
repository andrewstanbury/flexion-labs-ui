import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { layout, radius, space } from '../tokens';
import { useTheme } from '../UIProvider';
import { Pressable } from '../primitives/Pressable';
import { Text } from '../primitives/Text';
import { Icon } from '../primitives/Icon';
import { SectionHeader } from './SectionHeader';

// ListGroup — an inset group of rows on one white card, split by hairlines
// rather than each row being its own card. Reads as one calm block where a
// stack of separate cards reads as noise. Optional uppercase title above.
//
//   <ListGroup title="Needs review">
//     <ListGroup.Row title="Calf raise" subtitle="Round 2 · waiting since today" onPress={…} />
//     <ListGroup.Row title="Heel slides" trailing={<Tag label="New" tone="highlight" />} />
//   </ListGroup>
export type ListGroupProps = {
  title?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

function ListGroupRoot({ title, children, style }: ListGroupProps) {
  const t = useTheme();
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={style}>
      {title ? <SectionHeader title={title} /> : null}
      <View
        style={{
          backgroundColor: t.surfaceElevated,
          borderRadius: radius.card,
          borderWidth: 1,
          borderColor: t.border,
          overflow: 'hidden',
        }}
      >
        {rows.map((row, i) => (
          <Fragment key={row.key ?? i}>
            {i > 0 ? <View style={{ height: 1, backgroundColor: t.border }} /> : null}
            {row}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

export type ListGroupRowProps = {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
};

function Row({ title, subtitle, leading, trailing, onPress, accessibilityLabel }: ListGroupRowProps) {
  const body = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: layout.gapMd,
        paddingHorizontal: layout.card,
        paddingVertical: space[3],
        minHeight: 56,
      }}
    >
      {leading}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong">{title}</Text>
        {subtitle ? (
          <Text variant="caption" color="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {onPress && !trailing ? <Icon name="chevron-forward" size="sm" color="muted" /> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable.Touch
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
    >
      {body}
    </Pressable.Touch>
  );
}

export const ListGroup = Object.assign(ListGroupRoot, { Row });
