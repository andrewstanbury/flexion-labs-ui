import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../UIProvider';
import type { ComponentProps } from 'react';

// Icon — sized + colored via tokens so call sites never quote px or hex.
// Wraps Ionicons (the icon set already in use); add more icon families
// behind the same surface if/when needed.

type IoniconsName = ComponentProps<typeof Ionicons>['name'];
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type ColorRole = 'primary' | 'secondary' | 'muted' | 'accent' | 'danger' | 'inverse';

const SIZES: Record<Size, number> = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

export type IconProps = {
  name: IoniconsName;
  size?: Size | number;
  color?: ColorRole | string;
};

function resolveColor(c: ColorRole | string, t: ReturnType<typeof useTheme>): string {
  switch (c) {
    case 'primary':   return t.textPrimary;
    case 'secondary': return t.textSecondary;
    case 'muted':     return t.textMuted;
    case 'accent':    return t.accent;
    case 'danger':    return t.danger;
    case 'inverse':   return t.surface;
    default:          return c; // arbitrary raw color string (e.g. a hex value)
  }
}

export function Icon({ name, size = 'md', color: c = 'primary' }: IconProps) {
  const t = useTheme();
  const pixelSize = typeof size === 'number' ? size : SIZES[size];
  return <Ionicons name={name} size={pixelSize} color={resolveColor(c, t)} />;
}
