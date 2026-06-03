import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../primitives/Text';
import { useTheme } from '../UIProvider';

// App-wide thin bar shown when offline. Reads still work from the persisted
// query cache; this just sets expectations. The app passes its connectivity
// state and message (so the library stays free of app hooks / i18n). Colors
// come from useTheme() so it stays readable in light and dark.
export function OfflineBanner({ online, message }: { online: boolean; message: string }) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  if (online) return null;
  return (
    <View
      pointerEvents="none"
      style={{ paddingTop: insets.top, backgroundColor: theme.surfaceMuted }}
      className="absolute left-0 right-0 top-0 z-50"
    >
      <View className="px-4 py-1.5">
        <Text.Caption color="secondary" style={{ textAlign: 'center' }}>
          {message}
        </Text.Caption>
      </View>
    </View>
  );
}
