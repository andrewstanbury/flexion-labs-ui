import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SyncStatusBar } from './SyncStatusBar';
import { TopInsetConsumedContext } from '../primitives/Screen';
import type { SyncState } from './SyncStatusDot';

// Wraps the app's screen stack with a dedicated top bar that hosts the sync dot,
// so the (transparent) dot never overlaps a screen's own header actions.
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
  backend,
  children,
}: {
  state: SyncState;
  pendingCount?: number;
  show?: boolean;
  backgroundColor?: string;
  /**
   * Optional backend badge for the status row. Pass it only when the app has
   * decided the detail should be visible — the shell does not read dev-mode
   * state itself, so this stays a presentation component.
   */
  backend?: { label: string; host: string };
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();

  if (!show) return <>{children}</>;

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor }}>
      <SyncStatusBar state={state} pendingCount={pendingCount} backend={backend} />
      <TopInsetConsumedContext.Provider value={true}>
        <View style={{ flex: 1 }}>{children}</View>
      </TopInsetConsumedContext.Provider>
    </View>
  );
}
