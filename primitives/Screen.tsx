import { createContext, useContext } from 'react';
import { View, type ViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { layout } from '../tokens';
import { useTheme } from '../UIProvider';

// Set true by an ancestor that has ALREADY consumed the top safe-area inset
// (e.g. SyncStatusShell, which pads the notch + its bar once). When set, Screen
// drops its own 'top' edge so the notch isn't padded twice — the native
// SafeAreaView can't see a JS inset override, so this explicit flag is how we
// suppress the second pad. Defaults false → no change anywhere else.
export const TopInsetConsumedContext = createContext(false);

// Drop the 'top' edge when an ancestor already consumed the top inset, so the
// notch isn't padded twice. Pure → unit-testable.
export function effectiveScreenEdges(
  edges: ReadonlyArray<Edge>,
  topConsumed: boolean,
): ReadonlyArray<Edge> {
  return topConsumed && edges.includes('top') ? edges.filter((e) => e !== 'top') : edges;
}

// Screen — top-level page wrapper. Pairs SafeAreaView with the design-
// system background and standard horizontal gutters. Use this around every
// route component. `padded` defaults to true (adds screenX/screenY); pass
// false for full-bleed layouts (lists, sessions).

export type ScreenProps = ViewProps & {
  padded?: boolean;
  edges?: ReadonlyArray<Edge>;
  background?: 'surface' | 'surfaceElevated' | 'surfaceMuted';
  style?: StyleProp<ViewStyle>;
};

export function Screen({
  padded = true,
  edges = ['top', 'bottom'],
  background = 'surface',
  style,
  children,
  ...rest
}: ScreenProps) {
  const t = useTheme();
  // If an ancestor already consumed the top inset, don't pad it again.
  const topConsumed = useContext(TopInsetConsumedContext);
  return (
    <SafeAreaView
      edges={effectiveScreenEdges(edges, topConsumed)}
      style={[
        {
          flex: 1,
          backgroundColor: t[background],
          paddingHorizontal: padded ? layout.screenX : 0,
          paddingVertical: padded ? layout.screenY : 0,
        },
        style,
      ]}
    >
      <View {...rest} style={{ flex: 1 }}>
        {children}
      </View>
    </SafeAreaView>
  );
}
