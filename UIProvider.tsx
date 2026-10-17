import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, useColorScheme } from 'react-native';
import { type Scheme } from './tokens';
import { resolvePalette } from './lib/palettes';
import { DEFAULT_APPEARANCE, useAppearanceStore, type AppearancePrefs } from './hooks/useAppearanceStore';

// Primitives resolve their colors via `useScheme()`. Default behavior is to
// follow the OS color scheme; the app can override by wrapping the tree in
// <UIProvider scheme="dark"> — useful when the user has a manual
// light/dark/system preference that overrides the OS.

type UIContextValue = {
  scheme: Scheme;
};

const UIContext = createContext<UIContextValue | null>(null);

// Appearance overrides from a provider (previews, the kit, tests). Absent,
// the persisted useAppearanceStore applies.
const AppearanceOverride = createContext<Partial<AppearancePrefs> | null>(null);

export function UIProvider({
  scheme,
  appearance,
  children,
}: {
  scheme?: Scheme;
  /** Pin some appearance options for this subtree instead of the user's saved ones. */
  appearance?: Partial<AppearancePrefs>;
  children: ReactNode;
}) {
  const system = useColorScheme();
  const resolved: Scheme = scheme ?? (system === 'dark' ? 'dark' : 'light');
  const outer = useContext(AppearanceOverride);
  const merged = appearance ? { ...outer, ...appearance } : outer;
  return (
    <UIContext.Provider value={{ scheme: resolved }}>
      <AppearanceOverride.Provider value={merged}>{children}</AppearanceOverride.Provider>
    </UIContext.Provider>
  );
}

/** The appearance options in effect: provider overrides, else the saved ones. */
export function useAppearance(): AppearancePrefs {
  const override = useContext(AppearanceOverride);
  // One selector per field: a selector building a fresh object would re-render
  // every subscriber on every store write.
  const stored: AppearancePrefs = {
    palette: useAppearanceStore((st) => st.palette) ?? DEFAULT_APPEARANCE.palette,
    paletteDark: useAppearanceStore((st) => st.paletteDark) ?? DEFAULT_APPEARANCE.paletteDark,
    textSize: useAppearanceStore((st) => st.textSize) ?? DEFAULT_APPEARANCE.textSize,
    font: useAppearanceStore((st) => st.font) ?? DEFAULT_APPEARANCE.font,
    boldText: useAppearanceStore((st) => st.boldText) ?? DEFAULT_APPEARANCE.boldText,
    contrast: useAppearanceStore((st) => st.contrast) ?? DEFAULT_APPEARANCE.contrast,
    motion: useAppearanceStore((st) => st.motion) ?? DEFAULT_APPEARANCE.motion,
  };
  return override ? { ...stored, ...override } : stored;
}

/** The palette in effect for the current scheme. */
export function useActivePalette() {
  const scheme = useScheme();
  const a = useAppearance();
  return scheme === 'dark' && a.paletteDark !== 'same' ? a.paletteDark : a.palette;
}

/** True when motion should be skipped: the user chose "reduce", or "system" and the OS asks for it. */
export function useReducedMotion(): boolean {
  const { motion } = useAppearance();
  const [osReduce, setOsReduce] = useState(false);
  useEffect(() => {
    if (motion !== 'system') return;
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => alive && setOsReduce(v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setOsReduce);
    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, [motion]);
  return motion === 'reduce' || (motion === 'system' && osReduce);
}

export function useScheme(): Scheme {
  const ctx = useContext(UIContext);
  // Render without a provider falls back to the OS scheme. Lets primitives
  // be used in tests/storybook without a wrapper.
  const system = useColorScheme();
  return ctx?.scheme ?? (system === 'dark' ? 'dark' : 'light');
}

export function useTheme() {
  const scheme = useScheme();
  const palette = useActivePalette();
  const { contrast } = useAppearance();
  return resolvePalette(scheme, palette, contrast);
}

// Font-scale: multiplies every design-system Text's fontSize/lineHeight. The app
// sets this from the user's Text Size preference; defaults to 1 (no scaling) so
// primitives work without a provider (tests/storybook).
const FontScaleContext = createContext<number>(1);

export function FontScaleProvider({ scale, children }: { scale: number; children: ReactNode }) {
  return <FontScaleContext.Provider value={scale}>{children}</FontScaleContext.Provider>;
}

export function useFontScale(): number {
  return useContext(FontScaleContext);
}
