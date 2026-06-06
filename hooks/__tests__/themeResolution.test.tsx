import * as RN from 'react-native';
import { renderHook } from '@testing-library/react-native';
import { useIsDark } from '../useIsDark';
import { useThemeStore } from '../useThemeStore';
import { useScheme } from '../../UIProvider';

// Seed the persisted preference directly (no React render in flight), so the
// store's async persist middleware doesn't interleave with renderHook's act().
function setPreference(theme: 'system' | 'dark' | 'light') {
  useThemeStore.setState({ theme });
}

// Characterization tests for the TWO independent dark-mode resolution paths.
// These PIN the current (divergent) behavior — see docs/theme.md. They are NOT
// asserting the desired end state: today the apps don't wrap their tree in
// <UIProvider scheme={...}>, so primitive token colors (useScheme/useTheme)
// follow the OS while NativeWind `dark:` classes follow the persisted store
// (useIsDark). If a future change collapses these two paths, update this file.

function mockOS(scheme: 'light' | 'dark') {
  return jest.spyOn(RN, 'useColorScheme').mockReturnValue(scheme);
}

afterEach(() => {
  jest.restoreAllMocks();
  // Reset the persisted preference back to its default for isolation.
  setPreference('system');
});

describe('Path 2 — useIsDark (persisted-preference-driven)', () => {
  it("'system' preference follows the OS scheme", () => {
    mockOS('dark');
    const dark = renderHook(() => useIsDark());
    expect(dark.result.current).toBe(true);
    dark.unmount();

    mockOS('light');
    const light = renderHook(() => useIsDark());
    expect(light.result.current).toBe(false);
  });

  it("'dark' preference forces dark even when the OS is light", () => {
    mockOS('light');
    setPreference('dark');
    const { result } = renderHook(() => useIsDark());
    expect(result.current).toBe(true);
  });

  it("'light' preference forces light even when the OS is dark", () => {
    mockOS('dark');
    setPreference('light');
    const { result } = renderHook(() => useIsDark());
    expect(result.current).toBe(false);
  });
});

describe('Path 1 — useScheme (OS-driven, no UIProvider wrapper)', () => {
  it('follows the OS scheme and IGNORES the persisted preference', () => {
    // User forces dark, but the OS is light and no <UIProvider scheme> wraps us.
    mockOS('light');
    setPreference('dark');
    const { result } = renderHook(() => useScheme());
    // Token-color path stays 'light' — this is the documented divergence.
    expect(result.current).toBe('light');
  });
});

describe('The divergence (the bug this pins)', () => {
  it('useIsDark and useScheme disagree when the preference overrides the OS', () => {
    mockOS('light');
    setPreference('dark');

    const isDark = renderHook(() => useIsDark());
    const scheme = renderHook(() => useScheme());

    // NativeWind `dark:` path says dark; token-color path says light.
    expect(isDark.result.current).toBe(true);
    expect(scheme.result.current).toBe('light');
  });
});
