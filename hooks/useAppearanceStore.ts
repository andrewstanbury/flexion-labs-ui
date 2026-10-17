import { createPersistedStore } from './createPersistedStore';
import type { Contrast, PaletteId } from '../lib/palettes';

// Appearance preferences (v0.32.0), after retaskable.com's settings: palette
// (optionally a different one in dark mode), text size, font, bold text,
// contrast and motion. Light/dark/system stays in useThemeStore. Persisted per
// device; read by UIProvider, Text and Button.
export type TextSize = 'sm' | 'md' | 'lg' | 'xl';
export type FontChoice = 'system' | 'rounded' | 'serif';
export type MotionChoice = 'system' | 'reduce' | 'allow';

export type AppearancePrefs = {
  palette: PaletteId;
  /** 'same' follows `palette` in dark mode too. */
  paletteDark: PaletteId | 'same';
  textSize: TextSize;
  font: FontChoice;
  boldText: boolean;
  contrast: Contrast;
  motion: MotionChoice;
};

export const DEFAULT_APPEARANCE: AppearancePrefs = {
  palette: 'sage',
  paletteDark: 'same',
  textSize: 'md',
  font: 'system',
  boldText: false,
  contrast: 'default',
  motion: 'system',
};

type AppearanceStore = AppearancePrefs & {
  set: (patch: Partial<AppearancePrefs>) => void;
  reset: () => void;
};

export const useAppearanceStore = createPersistedStore<AppearanceStore>('appearance-preferences', (set) => ({
  ...DEFAULT_APPEARANCE,
  set: (patch) => set(patch),
  reset: () => set(DEFAULT_APPEARANCE),
}));
