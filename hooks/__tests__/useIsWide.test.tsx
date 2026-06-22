import { renderHook } from '@testing-library/react-native';
import { useWindowDimensions } from 'react-native';
import { useIsWide, WIDE_BREAKPOINT } from '../useIsWide';

// react-native's index re-exports useWindowDimensions from this submodule via a
// getter, so mocking the submodule controls the width useIsWide reads.
jest.mock('react-native/Libraries/Utilities/useWindowDimensions');
const mockUseWindowDimensions = useWindowDimensions as jest.MockedFunction<
  typeof useWindowDimensions
>;

function mockWidth(width: number) {
  mockUseWindowDimensions.mockReturnValue({ width, height: 1000, scale: 1, fontScale: 1 });
}

afterEach(() => jest.clearAllMocks());

describe('useIsWide', () => {
  it('is false below the breakpoint (phone)', () => {
    mockWidth(WIDE_BREAKPOINT - 1);
    const { result } = renderHook(() => useIsWide());
    expect(result.current).toBe(false);
  });

  it('is true at the breakpoint (tablet/desktop)', () => {
    mockWidth(WIDE_BREAKPOINT);
    const { result } = renderHook(() => useIsWide());
    expect(result.current).toBe(true);
  });

  it('honours a custom breakpoint', () => {
    mockWidth(900);
    const { result } = renderHook(() => useIsWide(1000));
    expect(result.current).toBe(false);
  });
});
