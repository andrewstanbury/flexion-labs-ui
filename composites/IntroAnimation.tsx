import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '../primitives/Text';
import { useReducedMotion } from '../UIProvider';

// The app's opening moment (v0.39.0). It starts on exactly the frame the
// native splash shows — the splash image's F, drawn at the size and place
// `resizeMode: 'contain'` gives it — so the hand-off from the native splash is
// invisible. Then the website's dot pops in beside the F (the flexionlabs.com
// logo, complete), the mark draws up and shrinks as the wordmark and tagline
// rise in under it, and the whole layer fades away over the app.
//
// Colours are the splash's, passed by each app (its app.config splash), not
// the user's palette: the first frame has to match a native image.
//
// About two seconds; a tap skips to the fade. With reduced motion it holds the
// finished logo briefly and fades, without movement.

/** The F in the splash image's 1024-unit square: stem, top bar, middle bar. */
const F_PARTS = [
  { x: 335, y: 295, w: 100, h: 450 },
  { x: 335, y: 295, w: 370, h: 92 },
  { x: 335, y: 495, w: 300, h: 84 },
] as const;
/** The website logo's dot, in the same square. */
const DOT = { x: 729, y: 754, size: 92 } as const;

export const INTRO_MS = { dot: 380, settle: 520, hold: 700, fade: 380 } as const;

export type IntroAnimationProps = {
  /** The native splash's background colour. */
  background: string;
  /** The F's colour in the splash image. */
  ink: string;
  /** The dot that completes the logo. */
  dot: string;
  brand?: string;
  tagline?: string;
  onDone: () => void;
};

export function IntroAnimation({ background, ink, dot, brand = 'FlexionLabs', tagline, onDone }: IntroAnimationProps) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const dotIn = useRef(new Animated.Value(0)).current;
  const settle = useRef(new Animated.Value(0)).current;
  const words = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const finished = useRef(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const native = Platform.OS !== 'web';
  const side = Math.min(width, height); // the splash image, contained
  const unit = side / 1024;
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
      dotIn.setValue(1);
      settle.setValue(1);
      words.setValue(1);
      const id = setTimeout(fadeOut, 600);
      return () => clearTimeout(id);
    }
    const run = Animated.sequence([
      Animated.delay(120),
      Animated.spring(dotIn, { toValue: 1, friction: 5, tension: 120, useNativeDriver: native }),
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

  const markScale = settle.interpolate({ inputRange: [0, 1], outputRange: [1, 0.42] });
  const markLift = settle.interpolate({ inputRange: [0, 1], outputRange: [0, lift] });
  const exitScale = fade.interpolate({ inputRange: [0, 1], outputRange: [1.06, 1] });
  const wordsRise = words.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });

  return (
    <Animated.View
      testID="intro-animation"
      style={[StyleSheet.absoluteFill, { zIndex: 1000, elevation: 1000, backgroundColor: background, opacity: fade }]}
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
            style={{
              position: 'absolute',
              left: (width - side) / 2,
              top: (height - side) / 2,
              width: side,
              height: side,
              transform: [{ translateY: markLift }, { scale: Animated.multiply(markScale, exitScale) }],
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
                opacity: dotIn.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
                transform: [{ scale: dotIn }],
              }}
            />
          </Animated.View>

          <Animated.View
            style={{
              position: 'absolute',
              left: 24,
              right: 24,
              top: height / 2 + lift + side * 0.26,
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
