import { View, type ViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { layout } from '../tokens';
import { useTheme } from '../UIProvider';

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
  return (
    <SafeAreaView
      edges={edges}
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
