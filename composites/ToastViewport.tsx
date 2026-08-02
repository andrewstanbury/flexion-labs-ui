import { useEffect, useRef } from 'react';
import type { ComponentProps } from 'react';
import { Animated, Easing, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../primitives/Text';
import { useTheme } from '../UIProvider';
import { radius, shadow, space } from '../tokens';
import { useToastStore, type Toast, type ToastVariant } from '../hooks/useToastStore';

// Host for transient status toasts — mount once per app as an absolute overlay
// sibling of the navigation Stack (inside SafeAreaProvider + UIProvider). It
// floats over content and the persistent OfflineBanner (which sits at z-50);
// toasts auto-dismiss, so being on top is fine. Driven by useToastStore.

const ICON: Record<ToastVariant, ComponentProps<typeof Ionicons>['name']> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
};

function ToastItem({ toast }: { toast: Toast }) {
  const t = useTheme();
  const dismiss = useToastStore((s) => s.dismiss);

  // Auto-dismiss after its lifetime; clears if the toast is removed first
  // (tapped, or pushed out by MAX_VISIBLE).
  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), toast.durationMs);
    return () => clearTimeout(timer);
  }, [toast.id, toast.durationMs, dismiss]);

  // The variant accent tints the icon + outline (green success / red error);
  // the face stays an elevated surface so the text reads in light and dark.
  const accent =
    toast.variant === 'error' ? t.danger : toast.variant === 'success' ? t.accent : t.border;

  // Entrance only. reanimated's declarative `entering`/`exiting` were replaced
  // with core Animated because reanimated 4 pulls react-native-worklets, which
  // Expo Go cannot load (see primitives/Pressable.tsx).
  //
  // The EXIT animation is genuinely lost: core Animated cannot animate a
  // component that is already unmounting, and reanimated's layout animations
  // are the whole reason that worked. Toasts now vanish rather than fading up.
  // Buying it back means keeping dismissed toasts mounted through an exit
  // tween in useToastStore — a state-machine change, not a styling one, so it
  // is deliberately not bundled into this fix.
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [enter]);

  return (
    <Animated.View
      style={{
        opacity: enter,
        transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
      }}
    >
      <Pressable
        onPress={() => dismiss(toast.id)}
        accessibilityRole="alert"
        accessibilityLabel={toast.message}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space[2],
          alignSelf: 'center',
          maxWidth: 480,
          marginTop: space[2],
          paddingVertical: space[3],
          paddingHorizontal: space[4],
          borderRadius: radius.pill,
          backgroundColor: t.surfaceElevated,
          borderWidth: 1,
          borderColor: accent,
          ...shadow.card,
        }}
      >
        <Ionicons name={ICON[toast.variant]} size={18} color={accent} />
        <Text.BodyStrong numberOfLines={2} style={{ flexShrink: 1 }}>
          {toast.message}
        </Text.BodyStrong>
      </Pressable>
    </Animated.View>
  );
}

export function ToastViewport() {
  const insets = useSafeAreaInsets();
  const toasts = useToastStore((s) => s.toasts);
  if (toasts.length === 0) return null;
  return (
    <View
      // box-none: empty area passes touches through to the screen; each toast
      // pill still receives its own tap-to-dismiss.
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        paddingTop: insets.top,
        paddingHorizontal: space[4],
        zIndex: 60,
        alignItems: 'center',
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </View>
  );
}
