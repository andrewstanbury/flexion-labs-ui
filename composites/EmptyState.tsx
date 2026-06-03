import { View } from 'react-native';
import { layout, radius, space } from '../tokens';
import { useTheme } from '../UIProvider';
import { Icon, type IconProps } from '../primitives/Icon';
import { Text } from '../primitives/Text';

// EmptyState — placeholder used when a list/page has no content. Centered
// icon + heading + body, with optional action slot.

export type EmptyStateProps = {
  iconName?: IconProps['name'];
  heading: string;
  body?: string;
  action?: React.ReactNode;
};

export function EmptyState({ iconName, heading, body, action }: EmptyStateProps) {
  const t = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: layout.screenX,
        paddingVertical: layout.screenY,
        gap: layout.gapMd,
      }}
    >
      {iconName ? (
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: radius.pill,
            backgroundColor: t.surfaceMuted,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: space[4],
          }}
        >
          <Icon name={iconName} size="xl" color="accent" />
        </View>
      ) : null}
      <Text variant="h2" color="primary" style={{ textAlign: 'center' }}>
        {heading}
      </Text>
      {body ? (
        <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
          {body}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: space[4], alignSelf: 'stretch' }}>{action}</View> : null}
    </View>
  );
}
