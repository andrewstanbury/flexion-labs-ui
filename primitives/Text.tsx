import { Platform, Text as RNText, type TextProps, type StyleProp, type TextStyle } from 'react-native';
import { typography } from '../tokens';
import { useAppearance, useTheme } from '../UIProvider';

// Text follows the phone's native text-size (OS Dynamic Type) via RN's default
// `allowFontScaling`. We cap how far it can grow so large accessibility sizes
// don't break tight layouts. (v0.7.0 dropped the in-app FontScaleProvider
// multiplier in favour of the OS setting; FontScaleProvider/useFontScale remain
// exported as deprecated no-ops for back-compat.)
const MAX_FONT_SCALE = 1.5;

// Type-scale primitive. Every variant resolves color, fontSize, lineHeight,
// and fontWeight from tokens. Callers pass an optional `style` for layout
// concerns (textAlign, marginTop, width) — never for color or sizing.

type Variant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'body'
  | 'bodyStrong'
  | 'caption'
  | 'captionStrong'
  | 'label'
  | 'button';

type ColorRole =
  | 'primary' | 'secondary' | 'muted' | 'accent' | 'danger' | 'inverse'
  | 'success' | 'warning' | 'info';

export type TextVariantProps = TextProps & {
  variant?: Variant;
  color?: ColorRole;
  /** Monospace — codes, IDs, anything read character by character. */
  mono?: boolean;
  italic?: boolean;
  /** Fixed-width digits, so columns of numbers and ticking timers don't jitter. */
  tabular?: boolean;
  align?: 'left' | 'center' | 'right';
  style?: StyleProp<TextStyle>;
};

// Font choices (v0.32.0). iOS has system "rounded" and "serif" designs; Android
// has a serif but no rounded system face, so rounded falls back to the default.
const FONT_FAMILY = {
  system: undefined,
  rounded: Platform.select({ ios: 'ui-rounded', web: 'ui-rounded, "SF Pro Rounded", system-ui, sans-serif', default: undefined }),
  serif: Platform.select({ ios: 'ui-serif', android: 'serif', web: 'ui-serif, Georgia, serif', default: 'serif' }),
} as const;

const TEXT_SIZE_SCALE = { sm: 0.92, md: 1, lg: 1.1, xl: 1.22 } as const;

const BOLDER: Record<string, '600' | '700' | '800' | '900'> = { '400': '600', '500': '600', '600': '700', '700': '800', '800': '900' };

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, Menlo, monospace' });

function useColor(role: ColorRole): string {
  const t = useTheme();
  switch (role) {
    case 'primary':   return t.textPrimary;
    case 'secondary': return t.textSecondary;
    case 'muted':     return t.textMuted;
    case 'accent':    return t.accent;
    case 'danger':    return t.danger;
    case 'inverse':   return t.surface;
    case 'success':   return t.success;
    case 'warning':   return t.warning;
    case 'info':      return t.info;
  }
}

function TextRoot({
  variant = 'body',
  color: role = 'primary',
  mono,
  italic,
  tabular,
  align,
  style,
  children,
  ...rest
}: TextVariantProps) {
  const color = useColor(role);
  const t = typography[variant];
  const appearance = useAppearance();
  const scale = TEXT_SIZE_SCALE[appearance.textSize] ?? 1;
  const family = mono ? MONO : FONT_FAMILY[appearance.font];
  const weight = appearance.boldText ? (BOLDER[t.fontWeight] ?? t.fontWeight) : t.fontWeight;
  return (
    <RNText
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      {...rest}
      style={[
        {
          color,
          fontSize: t.fontSize * scale,
          lineHeight: Math.round(t.lineHeight * scale),
          fontWeight: weight,
          ...(family ? { fontFamily: family } : null),
          // Spread rather than named: not every variant defines letterSpacing,
          // and listing it explicitly would set `undefined` on the ones that
          // don't. Picking fields one by one is also how the tracking added to
          // the type scale in v0.16.0 was silently dropped before this line.
          ...('letterSpacing' in t ? { letterSpacing: t.letterSpacing } : null),
          ...(italic ? { fontStyle: 'italic' as const } : null),
          ...(tabular ? { fontVariant: ['tabular-nums' as const] } : null),
          ...(align ? { textAlign: align } : null),
        },
        style,
      ]}
    >
      {children}
    </RNText>
  );
}

const make = (variant: Variant) => (props: Omit<TextVariantProps, 'variant'>) =>
  <TextRoot variant={variant} {...props} />;

export const Text = Object.assign(TextRoot, {
  Display:    make('display'),
  H1:         make('h1'),
  H2:         make('h2'),
  H3:         make('h3'),
  Body:       make('body'),
  BodyStrong: make('bodyStrong'),
  Caption:    make('caption'),
  CaptionStrong: make('captionStrong'),
  Label:      make('label'),
  ButtonText: make('button'),
});
