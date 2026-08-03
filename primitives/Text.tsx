import { Text as RNText, type TextProps, type StyleProp, type TextStyle } from 'react-native';
import { typography } from '../tokens';
import { useTheme } from '../UIProvider';

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
  | 'label'
  | 'button';

type ColorRole = 'primary' | 'secondary' | 'muted' | 'accent' | 'danger' | 'inverse';

export type TextVariantProps = TextProps & {
  variant?: Variant;
  color?: ColorRole;
  style?: StyleProp<TextStyle>;
};

function useColor(role: ColorRole): string {
  const t = useTheme();
  switch (role) {
    case 'primary':   return t.textPrimary;
    case 'secondary': return t.textSecondary;
    case 'muted':     return t.textMuted;
    case 'accent':    return t.accent;
    case 'danger':    return t.danger;
    case 'inverse':   return t.surface;
  }
}

function TextRoot({
  variant = 'body',
  color: role = 'primary',
  style,
  children,
  ...rest
}: TextVariantProps) {
  const color = useColor(role);
  const t = typography[variant];
  return (
    <RNText
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      {...rest}
      style={[
        {
          color,
          fontSize: t.fontSize,
          lineHeight: t.lineHeight,
          fontWeight: t.fontWeight,
          // Spread rather than named: not every variant defines letterSpacing,
          // and listing it explicitly would set `undefined` on the ones that
          // don't. Picking fields one by one is also how the tracking added to
          // the type scale in v0.16.0 was silently dropped before this line.
          ...('letterSpacing' in t ? { letterSpacing: t.letterSpacing } : null),
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
  Label:      make('label'),
  ButtonText: make('button'),
});
