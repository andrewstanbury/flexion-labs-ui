import { cloneElement, isValidElement, useRef, type ReactElement, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { controlHeight, radius, space } from '../tokens';
import { useTheme } from '../UIProvider';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

// Depth of the raised bottom "edge" — and how far the face presses down when
// tapped, collapsing the edge for a tactile 3D button-press (Duolingo-style).
const EDGE = 4;

export type ButtonProps = {
  children?: React.ReactNode;
  onPress?: () => void;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

type RootProps = ButtonProps & { variant: Variant };

// `border` is the subtle outline on the face; `bottomEdge` is the darker base
// the face rests on — together a bordered, raised "physical" button. On press
// the face drops onto the base and the edge disappears (ghost stays flat).
function useVariantStyle(variant: Variant) {
  const t = useTheme();
  switch (variant) {
    case 'primary':
      return { bg: t.accentSurface, fg: t.accentOn, border: t.accentBorder, bottomEdge: t.accentEdge };
    case 'secondary':
      return { bg: t.surfaceElevated, fg: t.textPrimary, border: t.border, bottomEdge: t.border };
    case 'ghost':
      return { bg: 'transparent', fg: t.textPrimary, border: 'transparent', bottomEdge: 'transparent' };
    case 'destructive':
      return { bg: t.dangerMuted, fg: t.danger, border: t.danger, bottomEdge: t.danger };
  }
}

// Rounded-rectangle (not pill) to match the raised button look.
function sizeStyle(size: Size) {
  switch (size) {
    case 'sm': return { height: controlHeight.sm, paddingH: space[4], radius: radius.md };
    case 'md': return { height: controlHeight.md, paddingH: space[5], radius: radius.md };
    case 'lg': return { height: controlHeight.lg, paddingH: space[6], radius: radius.lg };
  }
}

// Tint a left/right icon to match the button's text color (`v.fg`) so the icon
// and label are always the same color, whatever color the caller gave the icon.
// Icons here are Ionicons / the design-system Icon, which take a `color` prop.
function tintIcon(node: ReactNode, color: string): ReactNode {
  return isValidElement<{ color?: string }>(node) ? cloneElement(node, { color }) : node;
}

function ButtonRoot({
  variant,
  size = 'lg',
  loading = false,
  disabled = false,
  fullWidth = true,
  leftIcon,
  rightIcon,
  onPress,
  children,
  style,
  accessibilityLabel,
}: RootProps) {
  const v = useVariantStyle(variant);
  const s = sizeStyle(size);
  const isInactive = disabled || loading;
  const flat = variant === 'ghost';
  const edge = flat ? 0 : EDGE;
  const faceH = s.height - edge;

  // 0 = raised, 1 = pressed flat onto the base. Core Animated rather than
  // reanimated — see the note in primitives/Pressable.tsx: reanimated 4 pulls
  // react-native-worklets, which Expo Go cannot load, and it killed the whole
  // library at import time.
  const press = useRef(new Animated.Value(0)).current;
  // Interpolate rather than multiply: an Animated.Value cannot be read
  // synchronously, so `press.value * edge` has no equivalent here.
  const faceTranslateY = press.interpolate({
    inputRange: [0, 1],
    outputRange: [0, edge],
  });
  const animate = (toValue: number, duration: number) =>
    Animated.timing(press, { toValue, duration, useNativeDriver: true }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        if (!isInactive) animate(1, 40);
      }}
      onPressOut={() => {
        animate(0, 120);
      }}
      disabled={isInactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isInactive, busy: loading }}
      style={[
        {
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          paddingBottom: edge,
          opacity: isInactive ? 0.6 : 1,
        },
        style,
      ]}
    >
      {/* Darker base — the 3D edge the face sits above and presses into. */}
      {!flat && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: edge,
            bottom: 0,
            borderRadius: s.radius,
            backgroundColor: v.bottomEdge,
          }}
        />
      )}
      {/* Face — drops down by `edge` on press, collapsing the visible edge. */}
      <Animated.View
        style={[
          {
            height: faceH,
            borderRadius: s.radius,
            backgroundColor: v.bg,
            borderWidth: flat ? 0 : 1.5,
            borderColor: v.border,
            paddingHorizontal: s.paddingH,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: space[2],
          },
          { transform: [{ translateY: faceTranslateY }] },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={v.fg} size="small" />
        ) : (
          <>
            {tintIcon(leftIcon, v.fg)}
            <Text
              variant="button"
              color={variant === 'primary' ? 'inverse' : variant === 'destructive' ? 'danger' : 'primary'}
              // Primary text uses the accent's on-color token (readable on the
              // accent face: white on dark-mode green, dark plum on the
              // light-mode pastel pink) rather than a forced literal.
              style={[
                { textTransform: 'uppercase', letterSpacing: 0.8 },
                variant === 'primary' ? { color: v.fg } : null,
              ]}
            >
              {children}
            </Text>
            {tintIcon(rightIcon, v.fg)}
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}

const make = (variant: Variant) => (props: ButtonProps) => <ButtonRoot variant={variant} {...props} />;

export const Button = Object.assign(ButtonRoot as (props: RootProps) => ReactElement, {
  Primary:     make('primary'),
  Secondary:   make('secondary'),
  Ghost:       make('ghost'),
  Destructive: make('destructive'),
});
