import type { ReactNode } from 'react';
import { readFileSync } from 'fs';
import { renderHook } from '@testing-library/react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import { useWindowDimensions } from 'react-native';
import { useTabBarPadding } from '../useTabBarPadding';
import { useTabBarHeightStore } from '../useTabBarHeightStore';
import { WIDE_BREAKPOINT } from '../useIsWide';

// Fixed metrics so useSafeAreaInsets() resolves a 34px bottom inset in tests
// (no real window measurement happens under jest).
const METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 34 },
};

// useTabBarPadding branches on useIsWide(), which reads useWindowDimensions.
// Pin the viewport width per test so the branch is deterministic. Default to a
// phone width (below the breakpoint) for the bottom-bar cases.
jest.mock('react-native/Libraries/Utilities/useWindowDimensions');
const mockUseWindowDimensions = useWindowDimensions as jest.MockedFunction<
  typeof useWindowDimensions
>;

function mockWidth(width: number) {
  mockUseWindowDimensions.mockReturnValue({ width, height: 1000, scale: 1, fontScale: 1 });
}

beforeEach(() => {
  mockWidth(WIDE_BREAKPOINT - 1);
  // The height now lives in a module-level store rather than a context, so it
  // persists between tests unless reset.
  useTabBarHeightStore.setState({ height: null });
});
afterEach(() => jest.clearAllMocks());

function withProviders({ children }: { children: ReactNode }) {
  return <SafeAreaProvider initialMetrics={METRICS}>{children}</SafeAreaProvider>;
}

describe('useTabBarPadding', () => {
  it('uses the measured tab bar height once the bar has laid out', () => {
    useTabBarHeightStore.setState({ height: 80 });
    const { result } = renderHook(() => useTabBarPadding(), { wrapper: withProviders });
    expect(result.current).toBe(80 + 16);
  });

  it('honours a custom extra gap', () => {
    useTabBarHeightStore.setState({ height: 80 });
    const { result } = renderHook(() => useTabBarPadding(4), { wrapper: withProviders });
    expect(result.current).toBe(80 + 4);
  });

  it('falls back to the safe-area inset when no tab bar has been measured', () => {
    const { result } = renderHook(() => useTabBarPadding(), { wrapper: withProviders });
    expect(result.current).toBe(34 + 16);
  });

  it('ignores the bottom-bar height on wide screens (nav is a left rail)', () => {
    useTabBarHeightStore.setState({ height: 80 });
    mockWidth(WIDE_BREAKPOINT);
    const { result } = renderHook(() => useTabBarPadding(), { wrapper: withProviders });
    expect(result.current).toBe(34 + 16); // safe-area inset only, not the 80px bar
  });

  // Regression guard for the Expo SDK 56/57 breakage: expo-router dropped React
  // Navigation, so importing BottomTabBarHeightContext from
  // @react-navigation/bottom-tabs pulled an orphaned copy into both apps and
  // threw at module scope, taking down every screen that imports the design
  // system. Nothing here may reach for that package again.
  it('does not depend on @react-navigation/bottom-tabs', () => {
    const src = readFileSync(`${__dirname}/../useTabBarPadding.ts`, 'utf8');
    // Match an actual import, not the word — the file explains this history in
    // a comment, and asserting on the bare string would fail on that comment.
    expect(src).not.toMatch(/from\s+['"]@react-navigation/);
  });
});
