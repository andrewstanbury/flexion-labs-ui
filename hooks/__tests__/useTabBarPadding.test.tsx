import type { ReactNode } from 'react';
import { renderHook } from '@testing-library/react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useWindowDimensions } from 'react-native';
import { useTabBarPadding } from '../useTabBarPadding';
import { WIDE_BREAKPOINT } from '../useIsWide';

// Fixed metrics so useSafeAreaInsets() resolves a 34px bottom inset in tests
// (no real window measurement happens under jest).
const METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 34 },
};

// useTabBarPadding now branches on useIsWide(), which reads useWindowDimensions.
// Pin the viewport width per test so the branch is deterministic. Default to a
// phone width (below the breakpoint) for the existing bottom-bar cases.
jest.mock('react-native/Libraries/Utilities/useWindowDimensions');
const mockUseWindowDimensions = useWindowDimensions as jest.MockedFunction<
  typeof useWindowDimensions
>;

function mockWidth(width: number) {
  mockUseWindowDimensions.mockReturnValue({ width, height: 1000, scale: 1, fontScale: 1 });
}

beforeEach(() => mockWidth(WIDE_BREAKPOINT - 1));
afterEach(() => jest.clearAllMocks());

function withProviders(tabBarHeight?: number) {
  return ({ children }: { children: ReactNode }) => (
    <SafeAreaProvider initialMetrics={METRICS}>
      {tabBarHeight === undefined ? (
        children
      ) : (
        <BottomTabBarHeightContext.Provider value={tabBarHeight}>{children}</BottomTabBarHeightContext.Provider>
      )}
    </SafeAreaProvider>
  );
}

describe('useTabBarPadding', () => {
  it('uses the measured tab bar height when inside the tab navigator', () => {
    const { result } = renderHook(() => useTabBarPadding(), { wrapper: withProviders(80) });
    expect(result.current).toBe(80 + 16);
  });

  it('honours a custom extra gap', () => {
    const { result } = renderHook(() => useTabBarPadding(4), { wrapper: withProviders(80) });
    expect(result.current).toBe(80 + 4);
  });

  it('falls back to the safe-area inset when there is no tab bar context', () => {
    const { result } = renderHook(() => useTabBarPadding(), { wrapper: withProviders(undefined) });
    expect(result.current).toBe(34 + 16);
  });

  it('ignores the bottom-bar height on wide screens (nav is a left rail)', () => {
    mockWidth(WIDE_BREAKPOINT);
    const { result } = renderHook(() => useTabBarPadding(), { wrapper: withProviders(80) });
    expect(result.current).toBe(34 + 16); // safe-area inset only, not the 80px bar
  });
});
