import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '../primitives/Text';
import { useReducedMotion } from '../UIProvider';

// The app's opening moment. It starts on exactly the frame the native splash
// shows (v0.40.0): the app icon — a rounded tile holding the F and its dot — at
// the size and place the native splash draws it, on the splash's backdrop
// colour. So the app can hide the native splash the moment the intro has drawn
// its first frame (`onFirstFrame`) and nothing visibly changes.
//
// Then (v0.41.0) the tile grows until it fills the screen, the F growing with
// it while the dot slips away; the dot pops back in beside the F (the
// flexionlabs.com logo, complete), the mark draws up and shrinks as the
// wordmark and tagline rise in under it, and the whole layer fades away over
// the app.
//
// Colours are the app icon's, passed by each app, not the user's palette: the
// first frame has to match a native image.
//
// About two and a half seconds; a tap skips to the fade. With reduced motion it
// holds the finished logo briefly and fades, without movement.

/** The F in the app icon's 1024-unit square: stem, top bar, middle bar. */
const F_PARTS = [
  { x: 335, y: 235, w: 100, h: 570 },
  { x: 335, y: 235, w: 395, h: 100 },
  { x: 335, y: 475, w: 320, h: 92 },
] as const;
/** The icon's dot, in the same square. */
const DOT = { x: 729, y: 754, size: 92 } as const;
/** The icon tile's corner radius, as a fraction of its side (iOS's icon mask). */
const TILE_RADIUS = 0.2237;

/**
 * The tile's share of the splash image's width. The splash image is the icon
 * tile centred on a transparent square this many times larger, so the same
 * image reads right both where the native splash draws it at `imageWidth` and
 * where Expo Go fits it to the screen width.
 */
export const SPLASH_TILE_FRACTION = 0.3;

export const INTRO_MS = { expand: 620, dot: 380, settle: 520, hold: 700, fade: 380 } as const;

export type IntroAnimationProps = {
  /** The icon tile's colour — the full-screen colour once the tile has grown. */
  background: string;
  /** The native splash's colour around the tile. Omitted, the same as `background`. */
  backdrop?: string;
  /** The F's colour in the icon. */
  ink: string;
  /** The icon's dot. */
  dot: string;
  brand?: string;
  tagline?: string;
  /**
   * The width the native splash draws its (square) image at, in points: the
   * expo-splash-screen plugin's `imageWidth`. Omitted, the image fills the
   * shorter screen side (the legacy `resizeMode: 'contain'` splash).
   */
  splashSize?: number;
  /** Called once the first frame — identical to the native splash — is on screen. */
  onFirstFrame?: () => void;
  /** How long the first frame holds before the tile grows (ms): time for the native splash to fade off. */
  holdMs?: number;
  onDone: () => void;
};

export function IntroAnimation({
  background,
  backdrop = background,
  ink,
  dot,
  brand = 'FlexionLabs',
  tagline,
  splashSize,
  onFirstFrame,
  holdMs = 120,
  onDone,
}: IntroAnimationProps) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const expand = useRef(new Animated.Value(0)).current;
  const dotIn = useRef(new Animated.Value(0)).current;
  const settle = useRef(new Animated.Value(0)).current;
  const words = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const finished = useRef(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const native = Platform.OS !== 'web';
  const short = Math.min(width, height);
  // The splash image as the native splash draws it, and the tile inside it.
  const tile = (splashSize ?? short) * SPLASH_TILE_FRACTION;
  const unit = tile / 1024;
  // A rounded square covers the screen once its inscribed circle does.
  const cover = (Math.hypot(width, height) * 1.04) / tile;
  // The mark's size once the tile fills the screen, and where it settles.
  const hero = (short * 0.8) / tile;
  const settled = (short * 0.42) / tile;
  const firstFrame = useRef(false);
  const reportFirstFrame = () => {
    if (firstFrame.current) return;
    firstFrame.current = true;
    onFirstFrame?.();
  };
  const lift = -Math.min(110, height * 0.12);

  const fadeOut = () => {
    if (finished.current) return;
    finished.current = true;
    Animated.timing(fade, {
      toValue: 0,
      duration: reduceMotion ? 220 : INTRO_MS.fade,
      easing: Easing.out(Easing.quad),
      useNativeDriver: native,
    }).start(() => doneRef.current());
  };

  useEffect(() => {
    if (reduceMotion) {
      expand.setValue(1);
      dotIn.setValue(1);
      settle.setValue(1);
      words.setValue(1);
      const id = setTimeout(fadeOut, 600);
      return () => clearTimeout(id);
    }
    const run = Animated.sequence([
      Animated.delay(holdMs),
      Animated.timing(expand, {
        toValue: 1,
        duration: INTRO_MS.expand,
        easing: Easing.bezier(0.65, 0, 0.25, 1),
        useNativeDriver: native,
      }),
      // The rest thresholds end the spring once the bounce is too small to see,
      // so the logo moves on without a dead pause at full size.
      Animated.spring(dotIn, {
        toValue: 1,
        friction: 5,
        tension: 120,
        restSpeedThreshold: 0.4,
        restDisplacementThreshold: 0.03,
        useNativeDriver: native,
      }),
      Animated.parallel([
        Animated.timing(settle, {
          toValue: 1,
          duration: INTRO_MS.settle,
          easing: Easing.bezier(0.2, 0.8, 0.2, 1),
          useNativeDriver: native,
        }),
        Animated.timing(words, {
          toValue: 1,
          duration: INTRO_MS.settle,
          delay: 160,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: native,
        }),
      ]),
      Animated.delay(INTRO_MS.hold),
    ]);
    run.start(({ finished: ran }) => {
      if (ran) fadeOut();
    });
    return () => run.stop();
    // Runs once: the intro plays a single time per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tileScale = expand.interpolate({ inputRange: [0, 1], outputRange: [1, cover] });
  // The mark grows with the tile, then settles up and smaller (from hero size).
  const markGrow = expand.interpolate({ inputRange: [0, 1], outputRange: [1, hero] });
  const markSettle = settle.interpolate({ inputRange: [0, 1], outputRange: [1, settled / hero] });
  const markLift = settle.interpolate({ inputRange: [0, 1], outputRange: [0, lift] });
  const exitScale = fade.interpolate({ inputRange: [0, 1], outputRange: [1.06, 1] });
  const wordsRise = words.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  // The icon's dot slips away while the tile grows, then pops back in.
  const dotShown = Animated.add(
    expand.interpolate({ inputRange: [0, 0.45], outputRange: [1, 0], extrapolate: 'clamp' }),
    dotIn,
  );

  const centred = { position: 'absolute' as const, left: (width - tile) / 2, top: (height - tile) / 2, width: tile, height: tile };

  return (
    <Animated.View
      testID="intro-animation"
      onLayout={reportFirstFrame}
      style={[StyleSheet.absoluteFill, { zIndex: 1000, elevation: 1000, backgroundColor: backdrop, opacity: fade }]}
    >
      <Pressable
        testID="intro-skip"
        accessibilityRole="button"
        accessibilityLabel={`${brand}. Skip intro`}
        onPress={fadeOut}
        style={StyleSheet.absoluteFill}
      >
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Animated.View
            testID="intro-tile"
            style={{
              ...centred,
              borderRadius: tile * TILE_RADIUS,
              backgroundColor: background,
              transform: [{ scale: tileScale }],
            }}
          />

          <Animated.View
            style={{
              ...centred,
              transform: [{ translateY: markLift }, { scale: Animated.multiply(Animated.multiply(markGrow, markSettle), exitScale) }],
            }}
          >
            {F_PARTS.map((p, i) => (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  left: p.x * unit,
                  top: p.y * unit,
                  width: p.w * unit,
                  height: p.h * unit,
                  borderRadius: 14 * unit,
                  backgroundColor: ink,
                }}
              />
            ))}
            <Animated.View
              testID="intro-dot"
              style={{
                position: 'absolute',
                left: DOT.x * unit,
                top: DOT.y * unit,
                width: DOT.size * unit,
                height: DOT.size * unit,
                borderRadius: (DOT.size * unit) / 2,
                backgroundColor: dot,
                opacity: dotShown.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
                transform: [{ scale: dotShown }],
              }}
            />
          </Animated.View>

          <Animated.View
            style={{
              position: 'absolute',
              left: 24,
              right: 24,
              top: height / 2 + lift + short * 0.26,
              alignItems: 'center',
              gap: 6,
              opacity: words,
              transform: [{ translateY: wordsRise }],
            }}
          >
            <Text allowFontScaling={false} style={{ color: ink, fontSize: 32, lineHeight: 38, fontWeight: '800', letterSpacing: -0.8 }}>
              {brand}
            </Text>
            {tagline ? (
              <Text style={{ color: ink, opacity: 0.72, fontSize: 16, lineHeight: 22, fontWeight: '500', textAlign: 'center' }}>
                {tagline}
              </Text>
            ) : null}
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
