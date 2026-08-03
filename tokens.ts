// Single source of truth for the patient app's design tokens. Pure TS — no
// Tailwind / NativeWind coupling — so every primitive in @flexion-labs/ui
// resolves styles via React Native's StyleSheet API, not className.
//
// Anything visual in the app should resolve to a value in this file. The
// ESLint design-system rules (PR11) will fail any hex literal in the app
// that isn't sourced from `tokens.colors`.

export const colors = {
  // Warm cream surfaces — light-mode page + card backgrounds.
  sand: {
    50:  '#FAF6EF',
    100: '#F4EEE2',
    200: '#E9DFCB',
    300: '#D9CBAE',
    400: '#B8A786',
    500: '#9C8B6A',
    600: '#7C6E54',
    700: '#5C5240',
    800: '#3D372C',
    900: '#1C1A17',
  },
  // Sage green accent — active states, CTAs, progress.
  sage: {
    50:  '#EEF3EC',
    100: '#DCE6D8',
    200: '#BFD0B8',
    300: '#A2BB98',
    400: '#88A57E',
    500: '#7A9B7E',
    600: '#5C7F62',
    700: '#46624C',
    800: '#324638',
    900: '#1F2C23',
  },
  // Coral — the "energy" accent used by streak / motivation surfaces. A warm
  // counterpoint to sage that signals momentum rather than action. Previously
  // lived as bespoke hex (`#FF6B47`) in today/lib/theme; promoted here so it's
  // a first-class, themeable token rather than off-palette drift.
  coral: {
    50:  '#FFF1ED',
    100: '#FFE0D6',
    300: '#FF9C82',
    500: '#FF6B47',
    600: '#E0532F',
    700: '#B83F20',
  },
  // Pastel pink — light-mode primary/CTA + accents. Soft, rehab-friendly.
  // Softened in v0.7.0 (the earlier ramp read too vibrant against the cream
  // surfaces). Button faces use the pale 300; small accents (active tab, ring,
  // toggle) use 500 so they stay legible on cream/white; 800 is the readable
  // text color on a pastel-pink fill.
  blossom: {
    50:  '#FFF6FA',
    100: '#FDECF3',
    200: '#FBE0EA',
    300: '#F9D6E1',
    400: '#EFBED0',
    500: '#E892AE',
    600: '#CC7993',
    700: '#A85F7B',
    800: '#7C3D55',
    900: '#4E2536',
  },
  // Red ramp for destructive actions, error states, validation messages.
  danger: {
    50:  '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },
  // Neutral white/black anchors used by primitives that need a literal
  // white surface (e.g. Card.Elevated on light mode) without the palette.
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

// Semantic role aliases. Primitives should prefer these over reaching into
// the raw palette, so the day we re-skin we change one mapping not 200
// references. Each role resolves at theme-resolution time (see `theme()`).
export const semantic = {
  // Light mode: warm beige surfaces with a pastel-pink primary/accent.
  light: {
    surface:          colors.sand[50],
    surfaceElevated:  colors.white,
    surfaceMuted:     colors.sand[100],
    border:           colors.sand[200],
    textPrimary:      colors.sand[900],
    textSecondary:    colors.sand[700],
    textMuted:        colors.sand[500],
    accent:           colors.blossom[500],
    accentStrong:     colors.blossom[600],
    accentMuted:      colors.blossom[100],
    // Filled accent surfaces (e.g. the primary Button face, selected segment):
    // a pale pastel face with readable dark-plum content on top.
    accentSurface:    colors.blossom[300],
    accentOn:         colors.blossom[800],
    // Gentle, UNIFIED border + depression edge (v0.7.1): the raised button's
    // outline and its 3D base use the same soft pink so they read as one piece.
    accentBorder:     colors.blossom[500],
    accentEdge:       colors.blossom[500],
    energy:           colors.coral[500],
    energyStrong:     colors.coral[600],
    danger:           colors.danger[600],
    dangerMuted:      colors.danger[100],
  },
  // Dark mode: sage-green palette with green as the primary/accent.
  dark: {
    surface:          colors.sand[900],
    surfaceElevated:  colors.sand[800],
    surfaceMuted:     colors.sand[800],
    border:           colors.sand[700],
    textPrimary:      colors.sand[50],
    textSecondary:    colors.sand[300],
    textMuted:        colors.sand[500],
    accent:           colors.sage[400],
    accentStrong:     colors.sage[300],
    accentMuted:      colors.sage[800],
    // Green fill with white content on top (the established dark-mode look).
    accentSurface:    colors.sage[400],
    accentOn:         colors.white,
    accentBorder:     colors.sage[600],
    accentEdge:       colors.sage[700],
    energy:           colors.coral[500],
    energyStrong:     colors.coral[600],
    danger:           colors.danger[400],
    dangerMuted:      colors.danger[900],
  },
} as const;

// Spacing scale (4px grid). Primitives quote these by name; raw numbers
// (`marginTop: 17`) shouldn't appear in app code.
export const space = {
  0:  0,
  px: 1,
  1:  4,
  2:  8,
  3:  12,
  4:  16,
  5:  20,
  6:  24,
  7:  28,
  8:  32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

// Semantic spacing aliases for layout patterns that recur across screens.
export const layout = {
  screenX: space[6],   // horizontal page gutter (24)
  screenY: space[8],   // vertical page padding (32)
  card:    space[5],   // card inner padding (20)
  gapXs:   space[1],
  gapSm:   space[2],
  gapMd:   space[3],
  gapLg:   space[4],
  gapXl:   space[6],
} as const;

// Border-radius scale. `pill` = fully rounded; `card` is the standard card
// corner; `field` matches input height visually.
// Tightened 2026-08-02 alongside the type scale. `card` at 24 was the single
// loudest thing in the old look — very round corners dominate a screen made
// mostly of cards, and read as soft rather than precise. 13 keeps the corner
// visible without it becoming the subject.
//
// `field` drops to 12 so inputs read as crisp against the 46-52px control
// heights. The 2xl/3xl steps are kept for the few places that genuinely want a
// large radius (sheets, modals) rather than being folded into `card`.
export const radius = {
  none:  0,
  sm:    6,
  md:    11,
  field: 12,
  lg:    14,
  xl:    18,
  card:  13,
  '2xl': 20,
  '3xl': 24,
  pill:  9999,
} as const;

// Component heights — buttons + inputs in three sizes. Hardcoded
// `style={{ height: 52 }}` across the codebase becomes `controlHeight.lg`.
export const controlHeight = {
  sm: 40,
  md: 48,
  lg: 52,
} as const;

// Type scale. Each entry is [fontSize, lineHeight] in pixels. Primitives
// (`<Text.H1>` etc.) read from here; app code shouldn't ever set
// `fontSize` directly.
// Tightened 2026-08-02 to the denser scale the owner preferred in the sibling
// quorum-ui library. Three changes, applied consistently:
//
//   1. Sizes down 1-2px from h1 through label. 16px body is the platform
//      default and reads as "unstyled"; 15px reads as chosen.
//   2. Weights up one step on headings, labels and buttons. Smaller text needs
//      more weight to keep the same presence.
//   3. letterSpacing added — NEGATIVE on headings (large type looks loose at
//      default tracking) and POSITIVE on labels (small all-caps-ish text needs
//      air). This is the part that most makes type look deliberate, and it was
//      simply absent before.
//
// display stays 28/34: it is already the right size, and only gains the weight
// and tracking treatment.
export const typography = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '800' as const, letterSpacing: -0.5 },
  h1:      { fontSize: 22, lineHeight: 28, fontWeight: '800' as const, letterSpacing: -0.4 },
  h2:      { fontSize: 19, lineHeight: 25, fontWeight: '700' as const, letterSpacing: -0.2 },
  h3:      { fontSize: 16, lineHeight: 21, fontWeight: '700' as const, letterSpacing: -0.1 },
  body:    { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' as const },
  caption: { fontSize: 12.5, lineHeight: 17, fontWeight: '400' as const },
  label:   { fontSize: 11, lineHeight: 15, fontWeight: '800' as const, letterSpacing: 0.7 },
  button:  { fontSize: 15, lineHeight: 20, fontWeight: '800' as const },
} as const;

// Motion durations (ms). Use these for any Animated timing call to keep
// the app's "feel" coherent.
export const motion = {
  instant: 80,
  fast:    140,
  base:    220,
  slow:    320,
} as const;

// Elevation tokens — RN's shadow* props on iOS and elevation on Android.
// Use the `shadow.card` literal directly in StyleSheet to get parity.
export const shadow = {
  none: {
    shadowColor: colors.transparent,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  card: {
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  modal: {
    shadowColor: colors.black,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
} as const;

// `theme(scheme)` returns the resolved semantic palette for the current
// color scheme. Primitives should call this once at render and pass the
// result down to StyleSheet creators rather than reaching into `semantic`
// directly. Keeps the dark-mode branching in one place.
export type Scheme = 'light' | 'dark';
export function theme(scheme: Scheme) {
  return semantic[scheme];
}

export type Tokens = {
  colors: typeof colors;
  semantic: typeof semantic;
  space: typeof space;
  layout: typeof layout;
  radius: typeof radius;
  controlHeight: typeof controlHeight;
  typography: typeof typography;
  motion: typeof motion;
  shadow: typeof shadow;
};

export const tokens: Tokens = {
  colors,
  semantic,
  space,
  layout,
  radius,
  controlHeight,
  typography,
  motion,
  shadow,
};
