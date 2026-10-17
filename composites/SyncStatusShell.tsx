import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusStrip } from './StatusStrip';
import type { SyncWords } from '../lib/syncStatus';
import { TopInsetConsumedContext } from '../primitives/Screen';
import type { SyncState } from './SyncStatusDot';

// Wraps the app's screen stack with the status strip (StatusStrip: the brand,
// the sync button and, offline, a line under it), so the strip never overlaps a
// screen's own header actions.
//
// It pads the safe-area notch + the (short) bar ONCE, then tells descendants —
// via TopInsetConsumedContext — that the top inset is already handled, so each
// <Screen edges={['top']}> drops its own top pad and the notch isn't doubled.
// (The native SafeAreaView can't see a JS inset override, hence the explicit
// flag rather than overriding SafeAreaInsetsContext.)
//
// `show=false` (e.g. signed-out) renders children untouched, so screens keep
// their normal safe-area behaviour with no reserved bar. `backgroundColor`
// should match the current screen so the notch + bar blend in.
export function SyncStatusShell({
  state,
  pendingCount = 0,
  show = true,
  backgroundColor,
  brand,
  describe,
  offlineMessage,
  children,
}: {
  state: SyncState;
  pendingCount?: number;
  show?: boolean;
  backgroundColor?: string;
  /** The strip's wordmark (default FlexionLabs). */
  brand?: string;
  /** The app's own (e.g. translated) words for each sync state. */
  describe?: (state: SyncState, pendingCount: number) => SyncWords;
  /** The line under the strip while offline. */
  offlineMessage?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();

  if (!show) return <>{children}</>;

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor }}>
      <StatusStrip
        state={state}
        pendingCount={pendingCount}
        brand={brand}
        describe={describe}
        offlineMessage={offlineMessage}
      />
      <TopInsetConsumedContext.Provider value={true}>
        <View style={{ flex: 1 }}>{children}</View>
      </TopInsetConsumedContext.Provider>
    </View>
  );
}
