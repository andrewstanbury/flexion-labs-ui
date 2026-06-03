import { createContext, useContext, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { theme, type Scheme } from './tokens';

// Primitives resolve their colors via `useScheme()`. Default behavior is to
// follow the OS color scheme; the app can override by wrapping the tree in
// <UIProvider scheme="dark"> — useful when the user has a manual
// light/dark/system preference that overrides the OS.

type UIContextValue = {
  scheme: Scheme;
};

const UIContext = createContext<UIContextValue | null>(null);

// Button shape is the one component look that legitimately differs per app
// (the client uses a raised/physical button; the practitioner a flat pill).
// Each app injects its choice at the root via <UIProvider buttonShape>; the
// shared Button renders accordingly. Defaults to 'raised'.
export type ButtonShape = 'raised' | 'flat';
const ButtonShapeContext = createContext<ButtonShape>('raised');

export function UIProvider({
  scheme,
  buttonShape,
  children,
}: {
  scheme?: Scheme;
  buttonShape?: ButtonShape;
  children: ReactNode;
}) {
  const system = useColorScheme();
  const resolved: Scheme = scheme ?? (system === 'dark' ? 'dark' : 'light');
  return (
    <UIContext.Provider value={{ scheme: resolved }}>
      <ButtonShapeContext.Provider value={buttonShape ?? 'raised'}>
        {children}
      </ButtonShapeContext.Provider>
    </UIContext.Provider>
  );
}

export function useScheme(): Scheme {
  const ctx = useContext(UIContext);
  // Render without a provider falls back to the OS scheme. Lets primitives
  // be used in tests/storybook without a wrapper.
  const system = useColorScheme();
  return ctx?.scheme ?? (system === 'dark' ? 'dark' : 'light');
}

export function useTheme() {
  return theme(useScheme());
}

export function useButtonShape(): ButtonShape {
  return useContext(ButtonShapeContext);
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
