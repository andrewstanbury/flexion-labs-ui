import { ScrollView, RefreshControl, ActivityIndicator, View } from 'react-native';
import { layout, radius, space } from '../tokens';
import { useTheme } from '../UIProvider';
import { Screen } from '../primitives/Screen';
import { Icon, type IconProps } from '../primitives/Icon';
import { Text } from '../primitives/Text';

// StatusScreen — locked / informational full-screen state. Two roles:
// - 'awaiting' (neutral hourglass)
// - 'suspended' (pause)
// Plus a free-form variant when neither preset fits. Pull-to-refresh and
// a footer slot for actions (e.g. Sign out).

type Mode = 'awaiting' | 'suspended' | 'custom';

export type StatusScreenProps = {
  mode: Mode;
  iconName?: IconProps['name'];
  heading: string;
  body?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  footer?: React.ReactNode;
};

function defaultIcon(mode: Mode): IconProps['name'] {
  switch (mode) {
    case 'awaiting':  return 'hourglass-outline';
    case 'suspended': return 'pause-circle-outline';
    case 'custom':    return 'information-circle-outline';
  }
}

export function StatusScreen({
  mode,
  iconName,
  heading,
  body,
  refreshing = false,
  onRefresh,
  footer,
}: StatusScreenProps) {
  const t = useTheme();
  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: layout.screenX,
          paddingVertical: layout.screenY,
        }}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.accent} />
          ) : undefined
        }
      >
        <View style={{ alignItems: 'center' }}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: radius.pill,
              backgroundColor: t.surfaceMuted,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: space[6],
            }}
          >
            <Icon name={iconName ?? defaultIcon(mode)} size={48} color="accent" />
          </View>
          <Text variant="h1" color="primary" style={{ textAlign: 'center', marginBottom: space[3] }}>
            {heading}
          </Text>
          {body ? (
            <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
              {body}
            </Text>
          ) : null}
          {refreshing && onRefresh ? (
            <ActivityIndicator size="small" color={t.accent} style={{ marginTop: space[6] }} />
          ) : null}
        </View>

        {footer ? <View style={{ marginTop: layout.gapXl * 2 }}>{footer}</View> : null}
      </ScrollView>
    </Screen>
  );
}
