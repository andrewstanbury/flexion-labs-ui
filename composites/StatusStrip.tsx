import { useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { Text } from '../primitives/Text';
import { radius, shadow } from '../tokens';
import { useReducedMotion, useTheme } from '../UIProvider';
import { pendingBadge, syncSpins, syncStatus, type SyncTone, type SyncWords } from '../lib/syncStatus';
import type { SyncState } from './SyncStatusDot';

// The strip that stays at the top of every signed-in screen (v0.39.0), after
// Retaskable's status strip: the brand at the left, and at the right a sync
// button that is always there — its icon says the state at a glance (a cloud
// with a tick, turning arrows while syncing, a crossed-out cloud offline), a
// badge counts the changes still waiting, and pressing it drops the words.
// It never starts a sync: the app's queues drain by themselves.
//
// While offline a line sits under the strip, in the flow (not floating over
// the screen), so nothing it covers is lost.

export const STRIP_HEIGHT = 48;

function toneColor(tone: SyncTone, t: ReturnType<typeof useTheme>): string {
  if (tone === 'warn') return t.warning;
  if (tone === 'busy') return t.info;
  return t.success;
}

/** The website's mark: a sage tile with the F and its dot. */
function BrandMark() {
  const t = useTheme();
  return (
    <View
      style={{
        width: 26,
        height: 26,
        borderRadius: 7,
        backgroundColor: t.accentSurface,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text allowFontScaling={false} style={{ color: t.accentOn, fontSize: 16, lineHeight: 19, fontWeight: '800' }}>
        F
      </Text>
      <View
        style={{
          position: 'absolute',
          right: 4,
          bottom: 5,
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: t.accentMuted,
        }}
      />
    </View>
  );
}

/** Turns its child one full turn every 1.2 s while mounted (on the native
 *  thread on a phone, so a busy JS thread never stutters it). */
function Spin({ children }: { children: React.ReactNode }) {
  const turn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(turn, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web' }),
    );
    loop.start();
    return () => loop.stop();
  }, [turn]);
  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View testID="status-strip-spin" style={{ transform: [{ rotate }] }}>
      {children}
    </Animated.View>
  );
}

export type StatusStripProps = {
  state: SyncState;
  pendingCount?: number;
  /** The wordmark beside the mark. */
  brand?: string;
  /** The app's own words for each state (e.g. translated); English otherwise. */
  describe?: (state: SyncState, pendingCount: number) => SyncWords;
  /** The line under the strip while offline. None is drawn without it. */
  offlineMessage?: string;
};

export function StatusStrip({ state, pendingCount = 0, brand = 'FlexionLabs', describe, offlineMessage }: StatusStripProps) {
  const t = useTheme();
  // Tolerant of no provider (the UI kit page, tests): the drop then sits at the top.
  const topInset = useContext(SafeAreaInsetsContext)?.top ?? 0;
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const view = syncStatus(state, pendingCount, describe);
  const color = toneColor(view.tone, t);
  const badge = pendingBadge(pendingCount);
  const glyph = <Ionicons name={view.icon} size={22} color={color} />;

  return (
    <View>
      <View
        style={{
          height: STRIP_HEIGHT,
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: 16,
          paddingRight: 6,
          gap: 8,
        }}
      >
        <View accessible accessibilityRole="header" accessibilityLabel={brand} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <BrandMark />
          <Text
            numberOfLines={1}
            style={{ color: t.accentStrong, fontSize: 17, lineHeight: 22, fontWeight: '800', letterSpacing: -0.3 }}
          >
            {brand}
          </Text>
        </View>

        <Pressable
          testID="status-strip-sync"
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`${view.label}. ${view.detail}`}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: radius.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? t.surfaceMuted : 'transparent',
          })}
        >
          {syncSpins(state, reduceMotion) ? <Spin>{glyph}</Spin> : glyph}
          {badge ? (
            <View
              testID="status-strip-badge"
              style={{
                position: 'absolute',
                top: 5,
                right: 3,
                minWidth: 17,
                height: 17,
                paddingHorizontal: 4,
                borderRadius: radius.pill,
                backgroundColor: t.accentSurface,
                borderWidth: 1.5,
                borderColor: t.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text allowFontScaling={false} style={{ color: t.accentOn, fontSize: 10, lineHeight: 12, fontWeight: '700' }}>
                {badge}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {state === 'offline' && offlineMessage ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <View
            testID="status-strip-offline"
            accessibilityLiveRegion="polite"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: t.warningMuted,
              borderRadius: radius.md,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Ionicons name="cloud-offline-outline" size={16} color={t.warning} />
            <Text.Caption style={{ flexShrink: 1 }}>{offlineMessage}</Text.Caption>
          </View>
        </View>
      ) : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          testID="status-strip-scrim"
          accessibilityLabel="Close"
          style={StyleSheet.absoluteFill}
          onPress={() => setOpen(false)}
        >
          <View
            testID="status-strip-drop"
            style={{
              position: 'absolute',
              top: topInset + STRIP_HEIGHT - 2,
              right: 12,
              width: Math.min(320, width - 24),
              backgroundColor: t.surfaceElevated,
              borderColor: t.border,
              borderWidth: StyleSheet.hairlineWidth,
              borderRadius: radius.lg,
              padding: 14,
              gap: 4,
              ...shadow.modal,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name={view.icon} size={18} color={color} />
              <Text.BodyStrong style={{ flexShrink: 1 }}>{view.label}</Text.BodyStrong>
            </View>
            <Text.Caption color="secondary">{view.detail}</Text.Caption>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
