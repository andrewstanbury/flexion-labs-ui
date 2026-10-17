import { colors, semantic, type Scheme } from '../tokens';

// Appearance palettes (v0.32.0), after retaskable.com's appearance settings.
// "sage" is the FlexionLabs look and the default; the rest re-colour every
// surface, text and accent role. Values for the others are retaskable's, by
// role: surface/elevated/muted/border for the page, text/secondary/faint for
// type, fill/on/edge for filled controls, accent for tinted text and icons,
// wash for tinted backgrounds. (Its palettes that imitate other companies'
// products are deliberately not carried over.)

type RoleSet = {
  surface: string; elevated: string; muted: string; border: string;
  text: string; secondary: string; faint: string;
  accent: string; fill: string; on: string; edge: string; wash: string;
};

const RETASKABLE: Record<string, { label: string; light: RoleSet; dark: RoleSet }> = {
  ink: {
    label: 'Ink',
    light: { surface: '#F6F3EE', elevated: '#FFFCF8', muted: '#EBE6DC', border: '#DDD6C8', text: '#17171A', secondary: '#5C564E', faint: '#8A8378', accent: '#17171A', fill: '#17171A', on: '#F4F1EA', edge: '#000000', wash: '#F3F1EC' },
    dark: { surface: '#141414', elevated: '#1E1E22', muted: '#2A2A2E', border: '#3A3A40', text: '#F4F1EA', secondary: '#C9C4BA', faint: '#8A857C', accent: '#F4F1EA', fill: '#F4F1EA', on: '#17171A', edge: '#C9C4BA', wash: '#2A2A2E' },
  },
  harbor: {
    label: 'Harbor',
    light: { surface: '#F3F6FB', elevated: '#FFFFFF', muted: '#E6EEF8', border: '#D0DBEA', text: '#122033', secondary: '#3E5570', faint: '#7A8DA3', accent: '#1F4FD8', fill: '#1F4FD8', on: '#FFFFFF', edge: '#17398F', wash: '#E7EEFC' },
    dark: { surface: '#0E1624', elevated: '#162033', muted: '#1A2744', border: '#2A3C58', text: '#E8EEF8', secondary: '#B7C6DC', faint: '#7E92AD', accent: '#B9CBFF', fill: '#2A4FBE', on: '#F4F7FB', edge: '#17398F', wash: '#1A2744' },
  },
  iris: {
    label: 'Iris',
    light: { surface: '#F6F4FB', elevated: '#FFFFFF', muted: '#EEEAFE', border: '#DDD6F2', text: '#1E1633', secondary: '#53486E', faint: '#8A80A6', accent: '#5B45D6', fill: '#5B45D6', on: '#FFFFFF', edge: '#3A2A9A', wash: '#EEEAFE' },
    dark: { surface: '#14101F', elevated: '#1E1830', muted: '#241E40', border: '#3A3260', text: '#F2EEFF', secondary: '#C9BFFF', faint: '#8E84B0', accent: '#C9BFFF', fill: '#4C3BB8', on: '#F4F7FB', edge: '#2A2170', wash: '#241E40' },
  },
  cedar: {
    label: 'Cedar',
    light: { surface: '#F2F8F6', elevated: '#FFFFFF', muted: '#E5F6F1', border: '#C9E4DB', text: '#0E2420', secondary: '#3A5C54', faint: '#6E8A82', accent: '#0E7A62', fill: '#0E7A62', on: '#FFFFFF', edge: '#085443', wash: '#E5F6F1' },
    dark: { surface: '#0C1614', elevated: '#14211E', muted: '#132E28', border: '#234038', text: '#E7F6F1', secondary: '#B7D9CE', faint: '#7AA396', accent: '#8EE0C8', fill: '#0F6B56', on: '#F4F7FB', edge: '#084839', wash: '#132E28' },
  },
  grove: {
    label: 'Grove',
    light: { surface: '#F3F8F4', elevated: '#FFFFFF', muted: '#E5F6EB', border: '#C8E4D2', text: '#102418', secondary: '#3A5C48', faint: '#6E8A78', accent: '#17663A', fill: '#17663A', on: '#FFFFFF', edge: '#0E4426', wash: '#E5F6EB' },
    dark: { surface: '#0C140F', elevated: '#142018', muted: '#132E22', border: '#234032', text: '#E8F6EC', secondary: '#B7D9C2', faint: '#7AA388', accent: '#8EE0A8', fill: '#145C32', on: '#F4F7FB', edge: '#0C3D22', wash: '#132E22' },
  },
  amber: {
    label: 'Amber',
    light: { surface: '#FBF6EF', elevated: '#FFFCF7', muted: '#FFF1DC', border: '#E8D7C0', text: '#2A1C10', secondary: '#6A5038', faint: '#9A8068', accent: '#C45C00', fill: '#C45C00', on: '#FFFFFF', edge: '#8A3E00', wash: '#FFF1DC' },
    dark: { surface: '#16110C', elevated: '#241C14', muted: '#3A2410', border: '#4A3420', text: '#FFF4E6', secondary: '#E4C9A8', faint: '#A89070', accent: '#FFC58A', fill: '#8A4508', on: '#1C140C', edge: '#5C2E04', wash: '#3A2410' },
  },
  clay: {
    label: 'Clay',
    light: { surface: '#FBF5F4', elevated: '#FFFFFF', muted: '#FDECEA', border: '#F0D2CE', text: '#2A1210', secondary: '#6A403C', faint: '#A07874', accent: '#B42318', fill: '#B42318', on: '#FFFFFF', edge: '#7A120C', wash: '#FDECEA' },
    dark: { surface: '#160E0D', elevated: '#241614', muted: '#3A1614', border: '#4A2824', text: '#FFECEA', secondary: '#E8C0BA', faint: '#A8807A', accent: '#FFB0A8', fill: '#7A241C', on: '#FFF8F6', edge: '#4E120E', wash: '#3A1614' },
  },
  bloom: {
    label: 'Bloom',
    light: { surface: '#FBF5F8', elevated: '#FFFFFF', muted: '#FDE8F1', border: '#F0D0E0', text: '#2A1020', secondary: '#6A3850', faint: '#A07890', accent: '#B4236A', fill: '#B4236A', on: '#FFFFFF', edge: '#7A1448', wash: '#FDE8F1' },
    dark: { surface: '#160E12', elevated: '#24141C', muted: '#3A1428', border: '#4A2438', text: '#FFE8F2', secondary: '#E8C0D4', faint: '#A88098', accent: '#FFB0D0', fill: '#7A2450', on: '#FFF6FA', edge: '#4E1432', wash: '#3A1428' },
  },
  slate: {
    label: 'Slate',
    light: { surface: '#F4F6F8', elevated: '#FFFFFF', muted: '#E8EDF3', border: '#D5DDE6', text: '#1A222C', secondary: '#465464', faint: '#7C8A9A', accent: '#3D4A5C', fill: '#3D4A5C', on: '#FFFFFF', edge: '#242C38', wash: '#E8EDF3' },
    dark: { surface: '#12161C', elevated: '#1C222C', muted: '#242C38', border: '#343E4C', text: '#EEF2F6', secondary: '#C5CED8', faint: '#8A96A6', accent: '#D5DDE8', fill: '#3A4554', on: '#12161C', edge: '#242C38', wash: '#242C38' },
  },
};

export const PALETTE_IDS = ['sage', 'ink', 'harbor', 'iris', 'cedar', 'grove', 'amber', 'clay', 'bloom', 'slate'] as const;
export type PaletteId = (typeof PALETTE_IDS)[number];

export function isPaletteId(value: unknown): value is PaletteId {
  return typeof value === 'string' && (PALETTE_IDS as readonly string[]).includes(value);
}

export function paletteLabel(id: PaletteId): string {
  return id === 'sage' ? 'Sage' : RETASKABLE[id].label;
}

/** The colour a swatch for this palette shows (its light-mode fill). */
export function paletteSwatch(id: PaletteId): string {
  return id === 'sage' ? colors.sage[700] : RETASKABLE[id].light.fill;
}

export type Contrast = 'default' | 'high';
export type SemanticPalette = { [K in keyof typeof semantic.light]: string };

// ── colour maths ──────────────────────────────────────────────────────────
function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}
function hex([r, g, b]: number[]): string {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
}
export function mix(a: string, b: string, t: number): string {
  const x = rgb(a);
  const y = rgb(b);
  return hex(x.map((v, i) => v + (y[i] - v) * t));
}
function luminance(c: string): number {
  const [r, g, b] = rgb(c).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// ── semantic roles ────────────────────────────────────────────────────────
function fromRoles(base: SemanticPalette, r: RoleSet): SemanticPalette {
  return {
    ...base,
    surface: r.surface,
    surfaceElevated: r.elevated,
    surfaceMuted: r.muted,
    border: r.border,
    textPrimary: r.text,
    textSecondary: r.secondary,
    textMuted: r.faint,
    accent: r.accent,
    accentStrong: r.accent,
    accentMuted: r.wash,
    accentSurface: r.fill,
    accentOn: r.on,
    accentBorder: r.fill,
    accentEdge: r.edge,
    highlight: r.accent,
    highlightSurface: r.wash,
    highlightOn: r.accent,
  };
}

// Pastel light mode (v0.33.0): filled faces (buttons, selected chips) are the
// palette colour softened toward white, with a deep shade of the same hue as
// the label. The deep shade is darkened until it reads at 4.5:1 or better on
// the pastel face, so every palette stays legible. Dark mode is unchanged.
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function pastelFill(fill: string): { face: string; edge: string; on: string } {
  const face = mix(fill, '#FFFFFF', 0.72);
  const edge = mix(fill, '#FFFFFF', 0.45);
  let on = mix(fill, '#000000', 0.35);
  for (let t = 0.45; contrastRatio(on, face) < 4.5 && t <= 0.95; t += 0.1) on = mix(fill, '#000000', t);
  return { face, edge, on };
}

function pastel(p: SemanticPalette, solidFill: string): SemanticPalette {
  const { face, edge, on } = pastelFill(solidFill);
  return { ...p, accentSurface: face, accentBorder: face, accentEdge: edge, accentOn: on };
}

// High contrast: secondary text becomes primary, muted becomes secondary and
// hairlines darken, so nothing relies on a faint grey to be read.
function withContrast(p: SemanticPalette, contrast: Contrast): SemanticPalette {
  if (contrast !== 'high') return p;
  return {
    ...p,
    textSecondary: p.textPrimary,
    textMuted: p.textSecondary,
    border: mix(p.border, p.textPrimary, 0.35),
  };
}

const cache = new Map<string, SemanticPalette>();

export function resolvePalette(scheme: Scheme, palette: PaletteId = 'sage', contrast: Contrast = 'default'): SemanticPalette {
  const key = `${scheme}:${palette}:${contrast}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const base = semantic[scheme] as SemanticPalette;
  const roles = palette === 'sage' ? base : fromRoles(base, RETASKABLE[palette][scheme]);
  // Sage's own fill (sage-700) is a muted green that greys out when softened;
  // its brighter sage-500 gives a clearer pastel.
  const solidFill = palette === 'sage' ? colors.sage[500] : RETASKABLE[palette].light.fill;
  const shaped = scheme === 'light' ? pastel(roles, solidFill) : roles;
  const resolved = withContrast(shaped, contrast);
  cache.set(key, resolved);
  return resolved;
}

// ── Tailwind ramps for the apps ───────────────────────────────────────────
// The apps colour many screens with NativeWind classes (bg-sand-800,
// bg-sage-700) rather than theme tokens. Their tailwind configs read those
// ramps from CSS variables; paletteRamps() supplies the values for a palette
// so the whole app re-colours, not only the library components.
export type Ramp = Record<50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900, string>;

export function paletteRamps(palette: PaletteId): { sand: Ramp; sage: Ramp } {
  if (palette === 'sage') return { sand: { ...colors.sand }, sage: { ...colors.sage } };
  const { light: L, dark: D } = RETASKABLE[palette];
  const sand: Ramp = {
    50: L.surface,
    100: L.muted,
    200: L.border,
    300: mix(L.border, L.faint, 0.5),
    400: L.faint,
    500: mix(L.faint, L.secondary, 0.5),
    600: L.secondary,
    700: D.border,
    800: D.elevated,
    900: D.surface,
  };
  // Apps put white text on bg-sage-500 (dark mode) and bg-sage-700 (light),
  // so both must stay dark enough for it — ink's dark fill is near-white.
  const darkFill = luminance(D.fill) > 0.4 ? L.secondary : D.fill;
  const sage: Ramp = {
    50: L.wash,
    100: mix(L.wash, L.fill, 0.15),
    200: mix(L.wash, L.fill, 0.3),
    300: mix(L.wash, L.fill, 0.45),
    400: mix(L.wash, L.fill, 0.6),
    500: darkFill,
    600: mix(darkFill, L.fill, 0.5),
    700: L.fill,
    800: L.edge,
    900: mix(D.surface, L.fill, 0.2),
  };
  return { sand, sage };
}

/** "#46624C" → "70 98 76", the form tailwind's rgb(var(--x) / <alpha-value>) needs. */
export function rgbChannels(hexColor: string): string {
  return rgb(hexColor).join(' ');
}

/**
 * CSS variables for NativeWind's vars(): --sand-50 … --sage-900, --brand-*,
 * and --accent-fill / --accent-on — the filled-control face and its label for
 * the given scheme, so `bg-accent-fill` matches the library's buttons in both
 * modes (pastel in light).
 */
export function paletteVars(palette: PaletteId, scheme: Scheme = 'light', contrast: Contrast = 'default'): Record<string, string> {
  const { sand, sage } = paletteRamps(palette);
  const resolved = resolvePalette(scheme, palette, contrast);
  const out: Record<string, string> = {
    '--accent-fill': rgbChannels(resolved.accentSurface),
    '--accent-on': rgbChannels(resolved.accentOn),
  };
  for (const [step, value] of Object.entries(sand)) out[`--sand-${step}`] = rgbChannels(value);
  for (const [step, value] of Object.entries(sage)) {
    out[`--sage-${step}`] = rgbChannels(value);
    out[`--brand-${step}`] = rgbChannels(value);
  }
  return out;
}
