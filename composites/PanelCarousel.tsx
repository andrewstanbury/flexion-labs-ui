import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  GestureResponderEvent,
  PanResponder,
  PanResponderGestureState,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';
import { Icon } from '../primitives/Icon';
import { Pressable } from '../primitives/Pressable';
import { useTheme } from '../UIProvider';

const DEFAULT_INTERVAL_MS = 1800;
const FADE_MS = 300;
const TICK_MS = 100;
const CONTROLS_AUTO_HIDE_MS = 2500;

type Slot = 0 | 1;

// Plays an ordered set of static images like a video would: a play/pause
// button, a scrubbable timeline, controls that auto-hide during playback and
// reappear on tap — as close to real video-player chrome as a sequence of
// stills supports. For instructional panel frames stepping through an
// exercise, in place of a video, viewed hands-free (following along
// mid-exercise isn't compatible with having to touch the screen to advance).
// Plays through once and stops on the last panel — does not loop; tapping
// play after it stops replays from the first panel, same as a finished
// video. Presentational only: the app resolves each panel's URI (e.g. via
// useMediaUri) and passes the plain ordered array in, so this stays free of
// app/network concerns.
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
  // Start playing automatically. On by default — a static sequence with no
  // auto-advance isn't usable when the viewer can't touch the screen
  // (mid-exercise). The controls always work either way.
  autoPlay?: boolean;
  // false → pause playback (e.g. backgrounded/off-screen). Mirrors the
  // `active` prop on the video views this replaces.
  active?: boolean;
  // How long each panel stays on screen before advancing, in ms.
  intervalMs?: number;
  testID?: string;
}) {
  const theme = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const canPlay = uris.length > 1;
  const totalMs = Math.max(uris.length, 1) * intervalMs;

  const [elapsedMs, setElapsedMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay && canPlay);
  const [controlsVisible, setControlsVisible] = useState(!(autoPlay && canPlay));

  // Two-slot double buffer for the crossfade. Whichever slot is "active" is
  // fully opaque and showing; advancing loads the next frame into the OTHER
  // slot at opacity 0 (so it's invisible while decoding) and only starts the
  // actual fade once that image's onLoad fires. Swapping a single Image's
  // source and animating its opacity in the same tick shows a flash — the
  // fade starts before there's a decoded frame to fade in, so the frame pops
  // in partway through instead of dissolving smoothly. Waiting for onLoad is
  // what makes it seamless.
  const opacity0 = useRef(new Animated.Value(1)).current;
  const opacity1 = useRef(new Animated.Value(0)).current;
  const opacities: [Animated.Value, Animated.Value] = [opacity0, opacity1];
  const [slotUris, setSlotUris] = useState<[string | null, string | null]>([uris[0] ?? null, null]);
  const activeSlotRef = useRef<Slot>(0);
  const shownIndexRef = useRef(0);
  const pendingRef = useRef<{ slot: Slot; index: number } | null>(null);
  const mountedRef = useRef(true);
  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barWidthRef = useRef(0);
  const dragStartXRef = useRef(0);

  const onLayout = (e: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  // Reset everything when the sequence itself changes (a different exercise).
  useEffect(() => {
    setElapsedMs(0);
    const startPlaying = autoPlay && canPlay;
    setIsPlaying(startPlaying);
    setControlsVisible(!startPlaying);
    opacity0.setValue(1);
    opacity1.setValue(0);
    activeSlotRef.current = 0;
    shownIndexRef.current = 0;
    pendingRef.current = null;
    setSlotUris([uris[0] ?? null, null]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uris.join('|')]);

  // Playback clock — ticks while playing; the panel to show is derived from
  // elapsed time (below). Self-schedules each tick's own setTimeout inside
  // the previous tick's callback, rather than depending on elapsedMs being
  // in this effect's deps to re-run and reschedule — chaining through a
  // React re-render between every 100ms tick isn't guaranteed to keep pace
  // (state updates can batch), which drops ticks. A ref mirrors elapsedMs so
  // the loop always knows the true current value even mid-batch.
  const elapsedRef = useRef(elapsedMs);
  useEffect(() => {
    elapsedRef.current = elapsedMs;
  }, [elapsedMs]);

  useEffect(() => {
    if (!isPlaying || !active || !canPlay) return;
    if (elapsedRef.current >= totalMs) {
      setIsPlaying(false);
      setControlsVisible(true);
      return;
    }
    let cancelled = false;
    let timerId: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (cancelled) return;
      elapsedRef.current = Math.min(elapsedRef.current + TICK_MS, totalMs);
      setElapsedMs(elapsedRef.current);
      if (elapsedRef.current >= totalMs) {
        setIsPlaying(false);
        setControlsVisible(true);
        return;
      }
      timerId = setTimeout(tick, TICK_MS);
    };
    timerId = setTimeout(tick, TICK_MS);
    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [isPlaying, active, canPlay, totalMs]);

  // Starts loading whichever panel the clock says should be showing next
  // (into the non-active slot); handleSlotLoad below starts the actual fade
  // once it's decoded.
  useEffect(() => {
    if (!canPlay) return;
    const targetIndex = Math.min(Math.floor(elapsedMs / intervalMs), uris.length - 1);
    if (targetIndex === shownIndexRef.current || pendingRef.current?.index === targetIndex) return;
    const nextSlot: Slot = activeSlotRef.current === 0 ? 1 : 0;
    pendingRef.current = { slot: nextSlot, index: targetIndex };
    setSlotUris((prev) => {
      const next: [string | null, string | null] = [prev[0], prev[1]];
      next[nextSlot] = uris[targetIndex];
      return next;
    });
  }, [elapsedMs, intervalMs, uris, canPlay]);

  const handleSlotLoad = (slot: Slot) => {
    const pending = pendingRef.current;
    if (!pending || pending.slot !== slot || !mountedRef.current) return;
    pendingRef.current = null;
    shownIndexRef.current = pending.index;
    const incoming = opacities[slot];
    const outgoing = opacities[activeSlotRef.current];
    activeSlotRef.current = slot;
    Animated.parallel([
      Animated.timing(incoming, { toValue: 1, duration: FADE_MS, useNativeDriver: true }),
      Animated.timing(outgoing, { toValue: 0, duration: FADE_MS, useNativeDriver: true }),
    ]).start();
  };

  // Auto-hides the controls a couple of seconds into playback, same as
  // native video chrome; stays up while paused, or the whole time if the
  // viewer never plays.
  useEffect(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (!controlsVisible || !isPlaying) return;
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), CONTROLS_AUTO_HIDE_MS);
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [controlsVisible, isPlaying]);

  if (uris.length === 0) return null;

  const atEnd = shownIndexRef.current >= uris.length - 1 && elapsedMs >= totalMs;
  const iconName = isPlaying ? 'pause' : atEnd ? 'refresh' : 'play';
  const progress = totalMs > 0 ? Math.min(elapsedMs / totalMs, 1) : 0;

  const togglePlay = () => {
    if (!canPlay) return;
    if (!isPlaying && atEnd) {
      // Finished — replay from the first panel, same as a finished video.
      setElapsedMs(0);
      pendingRef.current = null;
      opacities[activeSlotRef.current].setValue(0);
      const firstSlot: Slot = activeSlotRef.current === 0 ? 1 : 0;
      opacities[firstSlot].setValue(1);
      activeSlotRef.current = firstSlot;
      shownIndexRef.current = 0;
      setSlotUris((prev) => {
        const next: [string | null, string | null] = [prev[0], prev[1]];
        next[firstSlot] = uris[0];
        return next;
      });
    }
    setControlsVisible(true);
    setIsPlaying((playing) => !playing);
  };

  // Reveal if hidden. If already visible, hide only while actually playing —
  // paused controls stay pinned up (there's no other way back to play).
  const handleContentTap = () => {
    if (!canPlay) return;
    setControlsVisible((visible) => {
      if (!visible) return true;
      return !isPlaying;
    });
  };

  // Jumps straight to whatever panel the tapped/dragged position on the
  // timeline corresponds to. A seek is an instant cut, not a crossfade —
  // that's the expected feel for scrubbing (video players don't dissolve
  // between frames while you drag either), and it's also simply correct:
  // there's no "next" panel to preload/decode-then-fade toward, the target
  // is wherever the viewer just pointed. Takes an X relative to the bar
  // itself (locationX at touch-down, then tracked via gesture dx) rather
  // than page-absolute coordinates + `.measure()` — one less native round
  // trip, and `.measure()` is notorious for returning zeroes on the very
  // first layout pass.
  const seekToLocalX = (x: number) => {
    const barWidth = barWidthRef.current;
    if (barWidth <= 0) return;
    const fraction = Math.max(0, Math.min(1, x / barWidth));
    const targetMs = fraction * totalMs;
    const targetIndex = Math.min(Math.floor(targetMs / intervalMs), uris.length - 1);
    setIsPlaying(false);
    setControlsVisible(true);
    if (targetIndex !== shownIndexRef.current) {
      pendingRef.current = null;
      const slot = activeSlotRef.current;
      setSlotUris((prev) => {
        const next: [string | null, string | null] = [prev[0], prev[1]];
        next[slot] = uris[targetIndex];
        return next;
      });
      opacities[slot].setValue(1);
      opacities[slot === 0 ? 1 : 0].setValue(0);
      shownIndexRef.current = targetIndex;
    }
    setElapsedMs(targetMs);
  };

  const onBarLayout = (e: { nativeEvent: { layout: { width: number } } }) => {
    barWidthRef.current = e.nativeEvent.layout.width;
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e: GestureResponderEvent) => {
      dragStartXRef.current = e.nativeEvent.locationX;
      seekToLocalX(e.nativeEvent.locationX);
    },
    onPanResponderMove: (_e: GestureResponderEvent, gesture: PanResponderGestureState) =>
      seekToLocalX(dragStartXRef.current + gesture.dx),
  });

  return (
    <View testID={testID} onLayout={onLayout} style={style ?? { width: '100%', aspectRatio }}>
      {size.width > 0 && size.height > 0 && (
        <>
          {([0, 1] as const).map((slot) =>
            slotUris[slot] ? (
              <Animated.Image
                key={slot}
                testID={testID ? `${testID}-slot-${slot}` : undefined}
                source={{ uri: slotUris[slot] as string }}
                onLoad={() => handleSlotLoad(slot)}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: theme.surfaceMuted,
                  opacity: opacities[slot],
                }}
                resizeMode="contain"
              />
            ) : null,
          )}
          {canPlay && (
            <Pressable
              testID={testID ? `${testID}-tap-area` : undefined}
              onPress={handleContentTap}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            >
              {controlsVisible && (
                <View
                  pointerEvents="box-none"
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                >
                  <View
                    pointerEvents="box-none"
                    style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Pressable
                      testID={testID ? `${testID}-toggle` : undefined}
                      onPress={togglePlay}
                      accessibilityRole="button"
                      accessibilityLabel={isPlaying ? 'Pause' : atEnd ? 'Replay' : 'Play'}
                    >
                      <View
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 28,
                          backgroundColor: 'rgba(0,0,0,0.45)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon name={iconName} size="lg" color="inverse" />
                      </View>
                    </Pressable>
                  </View>
                  <View
                    testID={testID ? `${testID}-timeline` : undefined}
                    onLayout={onBarLayout}
                    {...panResponder.panHandlers}
                    style={{ height: 28, justifyContent: 'center', paddingHorizontal: 12 }}
                  >
                    <View
                      style={{
                        height: 3,
                        borderRadius: 1.5,
                        backgroundColor: 'rgba(255,255,255,0.35)',
                        overflow: 'hidden',
                      }}
                    >
                      <View
                        testID={testID ? `${testID}-timeline-fill` : undefined}
                        style={{
                          height: 3,
                          borderRadius: 1.5,
                          backgroundColor: theme.accentStrong,
                          width: `${progress * 100}%`,
                        }}
                      />
                    </View>
                  </View>
                </View>
              )}
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}
