import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets, SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { SyncStatusBar } from './SyncStatusBar';
import type { SyncState } from './SyncStatusDot';

// Wraps the app's screen stack with a dedicated top bar that hosts the sync dot,
// so the (transparent) dot never overlaps a screen's own header actions. It pads
// the safe-area notch + the bar ONCE, then zeroes the top inset for descendants
// — so screens using <Screen edges={['top']}> don't double-pad below the bar.
//
// `show=false` (e.g. signed-out) renders children untouched, so screens keep
// their normal safe-area behaviour with no reserved bar. `backgroundColor`
// should match the current screen so the notch + bar blend in.
export function SyncStatusShell({
  state,
  pendingCount = 0,
  show = true,
  backgroundColor,
  children,
}: {
  state: SyncState;
  pendingCount?: number;
  show?: boolean;
  backgroundColor?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();

  if (!show) return <>{children}</>;

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor }}>
      <SyncStatusBar state={state} pendingCount={pendingCount} />
      <SafeAreaInsetsContext.Provider value={{ ...insets, top: 0 }}>
        <View style={{ flex: 1 }}>{children}</View>
      </SafeAreaInsetsContext.Provider>
    </View>
  );
}
