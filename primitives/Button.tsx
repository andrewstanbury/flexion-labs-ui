import type { ReactElement } from 'react';
import { ActivityIndicator, type StyleProp, type ViewStyle } from 'react-native';
import { controlHeight, radius, space, colors as palette } from '../tokens';
import { useTheme } from '../UIProvider';
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
// shade drawn as a thicker bottom border, together giving each filled button a
// bordered, raised "physical" look (ghost stays flat/borderless).
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

// Rounded-rectangle (not pill) to match the raised button look.
function sizeStyle(size: Size) {
  switch (size) {
    case 'sm': return { height: controlHeight.sm, paddingH: space[4], radius: radius.md };
    case 'md': return { height: controlHeight.md, paddingH: space[5], radius: radius.md };
    case 'lg': return { height: controlHeight.lg, paddingH: space[6], radius: radius.lg };
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
  const v = useVariantStyle(variant);
  const s = sizeStyle(size);
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
          borderWidth: variant === 'ghost' ? 0 : 1.5,
          borderBottomColor: v.bottomEdge,
          borderBottomWidth: variant === 'ghost' ? 0 : 4,
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
            // Primary text is forced white even when the resolved `inverse`
            // token doesn't match it (light surface).
            style={[
              { textTransform: 'uppercase', letterSpacing: 0.8 },
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
