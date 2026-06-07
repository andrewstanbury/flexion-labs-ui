import { useState } from 'react';
import { View, Pressable, Modal, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../primitives/Text';
import { useTheme } from '../UIProvider';

export type SyncState = 'saved' | 'syncing' | 'offline';

// Semantic status colours, independent of the theme accent (which is pink/green
// per mode). Mid-tone shades chosen to read on both the light beige and dark
// surfaces: green = saved, blue = syncing, amber = offline.
const STATUS: Record<SyncState, { color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  saved: { color: '#16a34a', icon: 'cloud-done-outline' },
  syncing: { color: '#2563eb', icon: 'sync-outline' },
  offline: { color: '#d97706', icon: 'cloud-offline-outline' },
};

// One-line, human description of the current sync state.
export function syncStatusLabel(state: SyncState, pendingCount: number): string {
  const changes = `${pendingCount} change${pendingCount === 1 ? '' : 's'}`;
  if (state === 'offline') {
    return pendingCount > 0
      ? `Offline · ${changes} waiting to sync`
      : 'Offline · changes saved on this device';
  }
  if (state === 'syncing') {
    return pendingCount > 0 ? `Syncing ${changes}…` : 'Syncing…';
  }
  return 'All changes saved';
}

// Just the glyph (spinner while syncing). Shared by SyncStatusDot + SyncStatusBar.
export function SyncStatusIcon({ state }: { state: SyncState }) {
  const { color, icon } = STATUS[state];
  return state === 'syncing' ? (
    <ActivityIndicator size="small" color={color} />
  ) : (
    <Ionicons name={icon} size={22} color={color} />
  );
}

// Standalone tappable sync-status dot with a popover (kept for ad-hoc use). The
// app shell uses <SyncStatusBar> / <SyncStatusShell> instead, which give the dot
// dedicated, non-overlapping space.
export function SyncStatusDot({
  state,
  pendingCount = 0,
}: {
  state: SyncState;
  pendingCount?: number;
}) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const color = STATUS[state].color;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel={syncStatusLabel(state, pendingCount)}
        style={{ padding: 6 }}
      >
        <SyncStatusIcon state={state} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)}>
          <View
            style={{
              position: 'absolute',
              top: insets.top + 44,
              right: 12,
              maxWidth: 280,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: theme.surfaceElevated,
              borderColor: theme.border,
              borderWidth: StyleSheet.hairlineWidth,
              borderRadius: 12,
              paddingVertical: 10,
              paddingHorizontal: 14,
              shadowColor: '#000',
              shadowOpacity: 0.12,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
            }}
          >
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
            <Text.Body style={{ flexShrink: 1 }}>{syncStatusLabel(state, pendingCount)}</Text.Body>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
