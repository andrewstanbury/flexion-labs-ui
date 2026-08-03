import { Children, createContext, useContext, Fragment, type ReactNode } from 'react';
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
//
// Two layout models, as of v0.19.0:
//
// - STANDALONE (default, unchanged): each row is its own rounded card. This is
//   what every existing screen renders, and nothing about it moves.
// - GROUPED (`ListItem.Group`): rows sit inside ONE card separated by
//   hairlines. Denser, and the structure the owner picked from the Strata
//   comparison.
//
// Grouping is additive on purpose. It is signalled by context rather than a
// prop, so a row does not need to know which model it is in and callers cannot
// get the two half-applied — wrapping in Group is the only thing that changes
// the look. Adopting it per screen is a separate, reviewable change; shipping
// it here cannot alter any screen that has not opted in.

type Variant = 'plain' | 'pressable' | 'destructive';

const GroupedContext = createContext(false);

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
  const grouped = useContext(GroupedContext);
  const titleColor = variant === 'destructive' ? 'danger' : 'primary';

  const body = (
    <View
      style={[
        {
          // In a group the container owns the surface, the radius and the
          // border, so a row must contribute none of them — otherwise you get
          // rounded corners nested inside rounded corners and a double edge at
          // every separator.
          backgroundColor: grouped ? 'transparent' : t.surfaceElevated,
          borderRadius: grouped ? 0 : radius.card,
          paddingHorizontal: space[4],
          paddingVertical: space[3],
          flexDirection: 'row',
          alignItems: 'center',
          gap: layout.gapMd,
          // Standalone rows need a floor so a title-only row is not cramped.
          // Grouped rows are the denser model by definition and let their
          // padding set the height — this is most of what "fits more on screen"
          // means here.
          ...(grouped ? null : { minHeight: 56 }),
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

export type ListItemGroupProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

// ListItem.Group — rows inside one card, separated by hairlines.
//
// Separators are drawn BETWEEN children here rather than as a top border on
// each row, because a row cannot see its own position: a per-row border either
// double-draws at the seam or leaves a stray line above the first row. Nulls
// are filtered first, so a conditionally-rendered row (`{canDelete && <Row/>}`)
// does not leave a separator with nothing under it.
function ListItemGroup({ children, style }: ListItemGroupProps) {
  const t = useTheme();
  const rows = Children.toArray(children).filter(Boolean);

  return (
    <GroupedContext.Provider value={true}>
      <View
        style={[
          {
            backgroundColor: t.surfaceElevated,
            borderRadius: radius.card,
            borderWidth: 1,
            borderColor: t.border,
            // Rows are square-cornered, so without clipping the first and last
            // would paint over the container's rounded corners on press.
            overflow: 'hidden',
          },
          style,
        ]}
      >
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i > 0 ? (
              <View style={{ height: 1, backgroundColor: t.border, marginLeft: space[4] }} />
            ) : null}
            {row}
          </Fragment>
        ))}
      </View>
    </GroupedContext.Provider>
  );
}

export const ListItem = Object.assign(ListItemRoot, {
  Plain:       make('plain'),
  Pressable:   make('pressable'),
  Destructive: make('destructive'),
  Group:       ListItemGroup,
});
