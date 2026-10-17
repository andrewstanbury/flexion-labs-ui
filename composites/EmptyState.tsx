import { View } from 'react-native';
import { layout, space } from '../tokens';
import { type IconProps } from '../primitives/Icon';
import { ArtOrb } from './Website';
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
        // The website's round character art with the icon on a white disc.
        <ArtOrb brief={`Illustration: ${heading}`} icon={iconName} size={128} style={{ marginBottom: space[4] }} />
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
