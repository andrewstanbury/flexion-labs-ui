import { View } from 'react-native';
import { radius } from '../tokens';
import { useTheme } from '../UIProvider';
import { Text } from '../primitives/Text';
import { pendingBadge } from '../lib/syncStatus';

// TabBadge — the count pinned to a tab's icon (TabBar and Sidebar). Same face
// as the status strip's pending badge; nothing renders for zero, and anything
// past 99 reads "99+". Place it inside a relatively positioned icon box.
export function TabBadge({ count, testID }: { count?: number; testID?: string }) {
  const t = useTheme();
  const label = pendingBadge(count ?? 0);
  if (!label) return null;
  return (
    <View
      testID={testID}
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: -4,
        right: -2,
        minWidth: 17,
        height: 17,
        paddingHorizontal: 4,
        borderRadius: radius.pill,
        backgroundColor: t.accentSurface,
        borderWidth: 1.5,
        borderColor: t.surfaceElevated,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text allowFontScaling={false} style={{ color: t.accentOn, fontSize: 10, lineHeight: 12, fontWeight: '700' }}>
        {label}
      </Text>
    </View>
  );
}

/** A tab's spoken name, with its count when it has one ("Review, 3"). */
export function tabA11yLabel(label: string, count?: number): string {
  return count && count > 0 ? `${label}, ${count}` : label;
}
