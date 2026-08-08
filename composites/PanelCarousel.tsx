import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../UIProvider';

const DEFAULT_INTERVAL_MS = 1800;

// Auto-sizing horizontal pager for an ordered set of static images — e.g.
// instructional panel frames stepping through an exercise, in place of a
// video. Auto-advances on a timer by default, looping — like a video playing
// hands-free, for following along mid-exercise when touching the screen
// isn't an option. Still swipeable as a manual override (e.g. browsing a
// catalogue). Presentational only: the app resolves each panel's URI (e.g.
// via useMediaUri) and passes the plain ordered array in, so this stays free
// of app/network concerns.
export function PanelCarousel({
  uris,
  aspectRatio = 1,
  style,
  autoPlay = true,
  active = true,
  intervalMs = DEFAULT_INTERVAL_MS,
  testID,
}: {
  uris: string[];
  // Only used to size the default container (width:'100%', aspectRatio) —
  // ignored once `style` is passed.
  aspectRatio?: number;
  // Overrides the default aspect-ratio sizing entirely (e.g. a fixed height
  // layout). Each image is measured to fill whatever this resolves to.
  style?: StyleProp<ViewStyle>;
  // Advance through panels automatically, looping. On by default — a static
  // sequence with no auto-advance isn't usable when the viewer can't touch
  // the screen (mid-exercise). Manual swipe still works either way.
  autoPlay?: boolean;
  // false → pause auto-advance (e.g. backgrounded/off-screen). Mirrors the
  // `active` prop on the video views this replaces.
  active?: boolean;
  // How long each panel stays on screen before advancing, in ms.
  intervalMs?: number;
  testID?: string;
}) {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [index, setIndex] = useState(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  }, []);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!size.width) return;
      const next = Math.round(e.nativeEvent.contentOffset.x / size.width);
      setIndex(Math.max(0, Math.min(next, uris.length - 1)));
    },
    [size.width, uris.length],
  );

  // Loops back to panel 0 after the last one. Uses the functional setState
  // form so a manual swipe in between ticks is respected — the next tick
  // always advances from wherever the viewer (or the last tick) left it,
  // rather than a stale closed-over index.
  useEffect(() => {
    if (!autoPlay || !active || uris.length < 2 || !size.width) return;
    const id = setInterval(() => {
      setIndex((current) => {
        const next = (current + 1) % uris.length;
        scrollRef.current?.scrollTo({ x: next * size.width, animated: true });
        return next;
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [autoPlay, active, uris.length, size.width, intervalMs]);

  if (uris.length === 0) return null;

  return (
    <View testID={testID} onLayout={onLayout} style={style ?? { width: '100%', aspectRatio }}>
      {size.width > 0 && size.height > 0 && (
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumScrollEnd}
          scrollEventThrottle={16}
          testID={testID ? `${testID}-scroll` : undefined}
        >
          {uris.map((uri, i) => (
            <Image
              key={`${uri}-${i}`}
              source={{ uri }}
              style={{ width: size.width, height: size.height, backgroundColor: theme.surfaceMuted }}
              resizeMode="contain"
            />
          ))}
        </ScrollView>
      )}
      {uris.length > 1 && (
        <View
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          className="items-center justify-end pb-3"
        >
          <View className="flex-row gap-1.5">
            {uris.map((_, i) => (
              <View
                key={i}
                testID={testID ? `${testID}-dot-${i}` : undefined}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: i === index ? theme.accentStrong : theme.surfaceMuted,
                  opacity: i === index ? 1 : 0.6,
                }}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
