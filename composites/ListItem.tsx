import { View, type StyleProp, type ViewStyle } from 'react-native';
import { layout, radius, space } from '../tokens';
import { useTheme } from '../UIProvider';
import { Pressable } from '../primitives/Pressable';
import { Text } from '../primitives/Text';
import { Icon } from '../primitives/Icon';

// ListItem — row in a settings/list. Three variants:
// - Plain: static row
// - Pressable: tappable row with optional right chevron
// - Destructive: tappable row rendered with the danger palette

type Variant = 'plain' | 'pressable' | 'destructive';

export type ListItemProps = {
  title: string;
  subtitle?: string;
  leftIcon?: React.ReactNode;
  rightContent?: React.ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

type RootProps = ListItemProps & { variant: Variant };

function ListItemRoot({
  variant,
  title,
  subtitle,
  leftIcon,
  rightContent,
  showChevron = variant === 'pressable',
  onPress,
  style,
}: RootProps) {
  const t = useTheme();
  const titleColor = variant === 'destructive' ? 'danger' : 'primary';

  const body = (
    <View
      style={[
        {
          backgroundColor: t.surfaceElevated,
          borderRadius: radius.card,
          paddingHorizontal: space[4],
          paddingVertical: space[3],
          flexDirection: 'row',
          alignItems: 'center',
          gap: layout.gapMd,
          minHeight: 56,
        },
        style,
      ]}
    >
      {leftIcon}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong" color={titleColor}>{title}</Text>
        {subtitle ? <Text variant="caption" color="secondary">{subtitle}</Text> : null}
      </View>
      {rightContent}
      {showChevron ? <Icon name="chevron-forward" size="md" color="muted" /> : null}
    </View>
  );

  if (variant === 'plain') return body;
  return <Pressable.Scale onPress={onPress}>{body}</Pressable.Scale>;
}

const make = (variant: Variant) => (props: ListItemProps) =>
  <ListItemRoot variant={variant} {...props} />;

export const ListItem = Object.assign(ListItemRoot, {
  Plain:       make('plain'),
  Pressable:   make('pressable'),
  Destructive: make('destructive'),
});
