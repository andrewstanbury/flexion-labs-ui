import { View } from 'react-native';
import { Text } from '../primitives/Text';
import { formatBytes } from '../lib/formatBytes';

// Thin storage-usage bar for the offline downloads UI. Tokenized via NativeWind
// palette classes + the design-system Text (no raw hex). Pass raw byte counts;
// it formats them.
export function StorageBar({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  return (
    <View>
      <View className="h-2 rounded-full bg-sand-100 dark:bg-sand-900 overflow-hidden">
        <View style={{ width: `${pct}%` }} className="h-full bg-sage-500" />
      </View>
      <Text.Caption color="secondary" style={{ marginTop: 6 }}>
        {formatBytes(used)} of {formatBytes(total)}
      </Text.Caption>
    </View>
  );
}
