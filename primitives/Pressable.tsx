import { useCallback, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable as RNPressable,
  type PressableProps,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { motion } from '../tokens';

// React Native's built-in Animated, NOT react-native-reanimated.
//
// reanimated 4 requires `react-native-worklets`, a separate native module Expo
// Go cannot load. Requiring it kills the app at import time, natively, with no
// JS error — and because index.ts re-exports everything, one animating
// primitive took down every screen in both apps. (bundledNativeModules.json
// does list worklets, but that file records the version `expo install` pins,
// not what ships inside the Expo Go binary.)
//
// Core Animated has no such dependency and works everywhere. These are simple
// transform tweens, so the swap is like-for-like: `useNativeDriver: true` keeps
// them off the JS thread, which is what reanimated was buying here.

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

// Pressable.Scale — scale-down on press. Used internally by Button,
// ListItem.Pressable, etc.; exposed for ad-hoc tappable surfaces.

const PRESS_DURATION = motion.instant;

export type PressableScaleProps = PressableProps & {
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
};

function ScaleImpl({
  children,
  style,
  onPressIn,
  onPressOut,
  scaleTo = 0.96,
  disabled,
  ...rest
}: PressableScaleProps) {
  // useRef, not useState: mutated on every press and must not re-render.
  const scale = useRef(new Animated.Value(1)).current;

  const animate = useCallback(
    (toValue: number) => {
      Animated.timing(scale, {
        toValue,
        duration: PRESS_DURATION,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start();
    },
    [scale],
  );

  const handlePressIn = useCallback(
    (e: GestureResponderEvent) => {
      if (!disabled) animate(scaleTo);
      onPressIn?.(e);
    },
    [disabled, scaleTo, onPressIn, animate],
  );
  const handlePressOut = useCallback(
    (e: GestureResponderEvent) => {
      animate(1);
      onPressOut?.(e);
    },
    [onPressOut, animate],
  );

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[{ transform: [{ scale }] }, style]}
    >
      {children}
    </AnimatedPressable>
  );
}

// Pressable.Touch — bare Pressable with no animation. For surfaces where a
// scale effect would feel out of place (e.g. tab bar items that have their
// own visual feedback).
function TouchImpl(props: PressableProps) {
  return <RNPressable {...props} />;
}

export const Pressable = Object.assign(ScaleImpl, {
  Scale: ScaleImpl,
  Touch: TouchImpl,
});
