import { useCallback } from 'react';
import {
  Pressable as RNPressable,
  type PressableProps,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { motion } from '../tokens';

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

// Pressable.Scale — Reanimated scale-down on press. Used internally by
// Button, ListItem.Pressable, etc.; exposed for ad-hoc tappable surfaces.

const PRESS_TIMING = { duration: motion.instant, easing: Easing.linear };

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
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(
    (e: GestureResponderEvent) => {
      if (!disabled) scale.value = withTiming(scaleTo, PRESS_TIMING);
      onPressIn?.(e);
    },
    [disabled, scaleTo, onPressIn, scale],
  );
  const handlePressOut = useCallback(
    (e: GestureResponderEvent) => {
      scale.value = withTiming(1, PRESS_TIMING);
      onPressOut?.(e);
    },
    [onPressOut, scale],
  );

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, style]}
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
