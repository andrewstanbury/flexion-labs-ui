import type { ReactElement } from 'react';
import { ActivityIndicator, type StyleProp, type ViewStyle } from 'react-native';
import { controlHeight, radius, space, colors as palette } from '../tokens';
import { useTheme, useButtonShape } from '../UIProvider';
import { Pressable } from './Pressable';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

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

// `border` is the subtle outline drawn on all sides; `bottomEdge` is a darker
// shade drawn as a thicker bottom border. Together they give the 'raised'
// button shape its bordered, physical look. The 'flat' shape (injected via
// <UIProvider buttonShape="flat">) ignores bottomEdge and only draws a border
// on the secondary variant.
function useVariantStyle(variant: Variant) {
  const t = useTheme();
  switch (variant) {
    case 'primary':
      return { bg: t.accent, fg: palette.white, border: palette.sage[600], bottomEdge: palette.sage[700] };
    case 'secondary':
      return { bg: t.surfaceElevated, fg: t.textPrimary, border: t.border, bottomEdge: t.border };
    case 'ghost':
      return { bg: 'transparent', fg: t.textPrimary, border: 'transparent', bottomEdge: 'transparent' };
    case 'destructive':
      return { bg: t.dangerMuted, fg: t.danger, border: t.danger, bottomEdge: t.danger };
  }
}

// 'raised' uses a rounded-rectangle; 'flat' uses a full pill.
function sizeStyle(size: Size, shape: 'raised' | 'flat') {
  const pill = shape === 'flat';
  switch (size) {
    case 'sm': return { height: controlHeight.sm, paddingH: space[4], radius: pill ? radius.pill : radius.md };
    case 'md': return { height: controlHeight.md, paddingH: space[5], radius: pill ? radius.pill : radius.md };
    case 'lg': return { height: controlHeight.lg, paddingH: space[6], radius: pill ? radius.pill : radius.lg };
  }
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
  const shape = useButtonShape();
  const raised = shape === 'raised';
  const v = useVariantStyle(variant);
  const s = sizeStyle(size, shape);
  const isInactive = disabled || loading;

  return (
    <Pressable.Scale
      onPress={onPress}
      disabled={isInactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isInactive, busy: loading }}
      style={[
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          // raised: outline on all sides + a thick darker bottom edge.
          // flat: outline only on the secondary variant, no bottom edge.
          borderWidth: raised ? (variant === 'ghost' ? 0 : 1.5) : variant === 'secondary' ? 1 : 0,
          ...(raised
            ? {
                borderBottomColor: v.bottomEdge,
                borderBottomWidth: variant === 'ghost' ? 0 : 4,
              }
            : null),
          borderRadius: s.radius,
          height: s.height,
          paddingHorizontal: s.paddingH,
          alignSelf: fullWidth ? 'auto' : 'flex-start',
          opacity: isInactive ? 0.6 : 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: space[2],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} size="small" />
      ) : (
        <>
          {leftIcon}
          <Text
            variant="button"
            color={variant === 'primary' ? 'inverse' : variant === 'destructive' ? 'danger' : 'primary'}
            // The 'raised' shape uppercases its label; 'flat' keeps normal case.
            // Primary text is forced white even when the resolved `inverse`
            // token doesn't match it (light surface).
            style={[
              raised ? { textTransform: 'uppercase', letterSpacing: 0.8 } : null,
              variant === 'primary' ? { color: palette.white } : null,
            ]}
          >
            {children}
          </Text>
          {rightIcon}
        </>
      )}
    </Pressable.Scale>
  );
}

const make = (variant: Variant) => (props: ButtonProps) => <ButtonRoot variant={variant} {...props} />;

export const Button = Object.assign(ButtonRoot as (props: RootProps) => ReactElement, {
  Primary:     make('primary'),
  Secondary:   make('secondary'),
  Ghost:       make('ghost'),
  Destructive: make('destructive'),
});
