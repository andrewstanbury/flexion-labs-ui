import { useEffect, useRef, useState } from 'react';
import { Animated, Image, LayoutChangeEvent, StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../UIProvider';

const DEFAULT_INTERVAL_MS = 1800;
const FADE_MS = 400;

// Plays an ordered set of static images like a video would — auto-advancing
// on a timer with a crossfade between frames, no swipe gesture, no page
// dots. For instructional panel frames stepping through an exercise, in
// place of a video, viewed hands-free (following along mid-exercise isn't
// compatible with having to touch the screen to advance). Plays through once
// and stops on the last panel — does not loop. Presentational only: the app
// resolves each panel's URI (e.g. via useMediaUri) and passes the plain
// ordered array in, so this stays free of app/network concerns.
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
  // Advance through panels automatically. On by default — a static sequence
  // with no auto-advance isn't usable when the viewer can't touch the screen
  // (mid-exercise).
  autoPlay?: boolean;
  // false → pause auto-advance (e.g. backgrounded/off-screen). Mirrors the
  // `active` prop on the video views this replaces.
  active?: boolean;
  // How long each panel stays on screen before advancing, in ms.
  intervalMs?: number;
  testID?: string;
}) {
  const theme = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [index, setIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const fade = useRef(new Animated.Value(1)).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  // Reset to the first frame whenever the sequence itself changes (a
  // different exercise's panels), not on every re-render.
  useEffect(() => {
    setIndex(0);
    setPrevIndex(null);
    fade.setValue(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uris.join('|')]);

  // Advances once per tick, crossfading in the next frame; stops for good at
  // the last panel rather than looping — this plays through once, like a
  // video that ends, not a GIF that repeats.
  useEffect(() => {
    if (!autoPlay || !active || uris.length < 2) return;
    if (index >= uris.length - 1) return;
    const id = setTimeout(() => {
      setPrevIndex(index);
      setIndex(index + 1);
      fade.setValue(0);
      Animated.timing(fade, { toValue: 1, duration: FADE_MS, useNativeDriver: true }).start();
    }, intervalMs);
    return () => clearTimeout(id);
  }, [autoPlay, active, uris.length, index, intervalMs, fade]);

  if (uris.length === 0) return null;

  return (
    <View testID={testID} onLayout={onLayout} style={style ?? { width: '100%', aspectRatio }}>
      {size.width > 0 && size.height > 0 && (
        <>
          {prevIndex !== null && (
            <Image
              testID={testID ? `${testID}-previous` : undefined}
              source={{ uri: uris[prevIndex] }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: theme.surfaceMuted,
              }}
              resizeMode="contain"
            />
          )}
          <Animated.Image
            testID={testID ? `${testID}-current` : undefined}
            source={{ uri: uris[index] }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: theme.surfaceMuted,
              opacity: fade,
            }}
            resizeMode="contain"
          />
        </>
      )}
    </View>
  );
}
