import { useWindowDimensions } from 'react-native';

// Single breakpoint that separates a phone (bottom tabs) from a larger screen
// — tablet, desktop browser, foldable — that gets the left navigation rail.
// 768 is the conventional tablet-portrait width; below it we stay mobile-first.
export const WIDE_BREAKPOINT = 768;

// True when the viewport is at least tablet-width. Reactive: re-renders on
// rotation / browser-window resize because it reads useWindowDimensions.
export function useIsWide(breakpoint: number = WIDE_BREAKPOINT): boolean {
  const { width } = useWindowDimensions();
  return width >= breakpoint;
}
