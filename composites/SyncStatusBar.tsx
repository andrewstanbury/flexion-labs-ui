import { useState } from 'react';
import { Pressable } from 'react-native';
import { Text } from '../primitives/Text';
import { SyncStatusIcon, syncStatusLabel, type SyncState } from './SyncStatusDot';

// A thin, dedicated top row that hosts the sync dot at the right — so the
// (transparent) dot has its own reserved space and never overlaps a screen's
// header actions. Tap anywhere on the row to reveal a one-line detail inline
// (left of the dot), so there's no fragile absolutely-positioned popover.
// `backend` is optional diagnostic chrome, shown only when the app passes it —
// which it does when dev mode is on (useDevModeStore) and the build allows it.
// It sits at the LEFT of the same row rather than in a new one, so nothing
// shifts when it appears and no extra vertical space is reserved for it.
export function SyncStatusBar({
  state,
  pendingCount = 0,
  backend,
}: {
  state: SyncState;
  pendingCount?: number;
  backend?: { label: string; host: string };
}) {
  const [open, setOpen] = useState(false);

  // Tapping already toggles the sync detail; the backend host rides the same
  // gesture so there is one thing to discover, not two.
  const detail = open
    ? [backend?.host, syncStatusLabel(state, pendingCount)].filter(Boolean).join('  ·  ')
    : null;

  return (
    <Pressable
      onPress={() => setOpen((v) => !v)}
      accessibilityRole="button"
      accessibilityLabel={
        backend
          ? `${syncStatusLabel(state, pendingCount)}. Backend: ${backend.label}, ${backend.host}`
          : syncStatusLabel(state, pendingCount)
      }
      style={{
        height: 20,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingHorizontal: 14,
        gap: 8,
      }}
    >
      {backend && (
        <Text.Caption
          color="secondary"
          numberOfLines={1}
          // marginRight: 'auto' pins it left without a spacer View, so the row
          // keeps its single-child-at-the-right layout when backend is absent.
          style={{ marginRight: 'auto', flexShrink: 0, fontVariant: ['tabular-nums'] }}
        >
          {backend.label}
        </Text.Caption>
      )}
      {detail && (
        <Text.Caption color="secondary" numberOfLines={1} style={{ flexShrink: 1 }}>
          {detail}
        </Text.Caption>
      )}
      <SyncStatusIcon state={state} />
    </Pressable>
  );
}
