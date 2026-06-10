import { View } from 'react-native';
import { Text } from '../primitives/Text';
import { useTheme } from '../UIProvider';
import { radius } from '../tokens';
import { formatBytes } from '../lib/formatBytes';

// Thin storage-usage bar for the offline downloads UI. Colors resolve through
// useTheme() (the scheme-bridged StyleSheet path) so the bar follows the app's
// light/dark preference exactly like every other primitive. It previously used
// NativeWind `dark:` classes (path 2), which this package's UIProvider does not
// drive — so the dark variant could diverge from the rest of the UI. The fill
// now uses the on-palette accent (pastel pink in light, sage in dark) instead
// of a hardcoded `bg-sage-500` that looked off in light (pink) mode.
export function StorageBar({ used, total }: { used: number; total: number }) {
  const theme = useTheme();
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  return (
    <View>
      <View
        testID="storage-bar-track"
        style={{
          height: 8,
          borderRadius: radius.pill,
          backgroundColor: theme.surfaceMuted,
          overflow: 'hidden',
        }}
      >
        <View
          testID="storage-bar-fill"
          style={{ width: `${pct}%`, height: '100%', backgroundColor: theme.accent }}
        />
      </View>
      <Text.Caption color="secondary" style={{ marginTop: 6 }}>
        {formatBytes(used)} of {formatBytes(total)}
      </Text.Caption>
    </View>
  );
}
