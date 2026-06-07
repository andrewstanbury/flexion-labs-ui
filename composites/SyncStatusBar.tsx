import { useState } from 'react';
import { Pressable } from 'react-native';
import { Text } from '../primitives/Text';
import { SyncStatusIcon, syncStatusLabel, type SyncState } from './SyncStatusDot';

// A thin, dedicated top row that hosts the sync dot at the right — so the
// (transparent) dot has its own reserved space and never overlaps a screen's
// header actions. Tap anywhere on the row to reveal a one-line detail inline
// (left of the dot), so there's no fragile absolutely-positioned popover.
export function SyncStatusBar({
  state,
  pendingCount = 0,
}: {
  state: SyncState;
  pendingCount?: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable
      onPress={() => setOpen((v) => !v)}
      accessibilityRole="button"
      accessibilityLabel={syncStatusLabel(state, pendingCount)}
      style={{
        height: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingHorizontal: 14,
        gap: 8,
      }}
    >
      {open && (
        <Text.Caption color="secondary" numberOfLines={1} style={{ flexShrink: 1 }}>
          {syncStatusLabel(state, pendingCount)}
        </Text.Caption>
      )}
      <SyncStatusIcon state={state} />
    </Pressable>
  );
}
