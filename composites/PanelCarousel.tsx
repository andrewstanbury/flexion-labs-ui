import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  GestureResponderEvent,
  PanResponder,
  PanResponderGestureState,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';
import * as Speech from 'expo-speech';
import { Icon } from '../primitives/Icon';
import { Pressable } from '../primitives/Pressable';
import { useTheme } from '../UIProvider';

const DEFAULT_INTERVAL_MS = 1800;
const FADE_MS = 900;
const TICK_MS = 100;
const CONTROLS_AUTO_HIDE_MS = 2500;
const REPLAY_AUTO_HIDE_MS = 800;
const CONTROLS_FADE_MS = 250;
const DEFAULT_HOLD_SECONDS = 2;
// Conservative (slower-than-typical) reading pace, so the ESTIMATE of how
// long narration will take leans long rather than short — better to hold a
// panel a beat too long than cut the narrator off mid-sentence. Duration is
// estimated up front rather than measured from a live TTS callback so the
// timeline/seek math stays fully deterministic (and testable without a real
// speech engine); NARRATION_BUFFER_MS below adds extra margin on top.
const WORDS_PER_MINUTE = 130;
const NARRATION_BUFFER_MS = 600;
// Slightly slower than expo-speech's default (1.0) — a calmer, more natural
// narrator cadence, closer to how someone would actually talk you through an
// exercise than the clipped default TTS pace. Divides into the duration
// estimate below (a slower rate takes proportionally longer to finish) so
// panel timing still accounts for it.
const NARRATION_RATE = 0.92;
// The generated panel frames are flat images on a solid white background —
// fixed regardless of app theme, not derived from `theme.surfaceMuted` (a
// gray that visibly seamed against them). Letterboxing under
// resizeMode="contain" should blend into the frame's own background, not the
// app's — matching the theme would just reintroduce the same mismatch in
// dark mode instead of light mode.
const PANEL_BACKGROUND_COLOR = '#FFFFFF';

type Slot = 0 | 1;

export type PanelStep = {
  text: string;
  // Minimum time to hold this panel, independent of narration length.
  holdSeconds?: number;
};

type ResolvedStep = { text: string; holdSeconds: number };

function estimateSpeechMs(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return 0;
  return (words / WORDS_PER_MINUTE) * 60_000;
}

// Which panel should be showing at a given point in elapsed playback time.
// Panel i occupies [boundaries[i], boundaries[i+1]) — the last panel keeps
// its own full dwell time before playback counts as "finished" (elapsedMs
// reaching boundaries[boundaries.length - 1], the total).
function indexForElapsed(elapsedMs: number, boundaries: number[]): number {
  for (let i = 0; i < boundaries.length - 1; i++) {
    if (elapsedMs < boundaries[i + 1]) return i;
  }
  return Math.max(boundaries.length - 2, 0);
}

// Plays an ordered set of static images like a video would: a play/pause
// button that auto-hides during playback and reappears on tap, plus a
// scrubbable timeline that stays visible throughout (a persistent progress
// bar, not part of the fading chrome) — as close to real video-player chrome
// as a sequence of stills supports. For instructional panel frames stepping
// through an
// exercise, in place of a video, viewed hands-free (following along
// mid-exercise isn't compatible with having to touch the screen to advance).
// Plays through once and stops on the last panel — does not loop; tapping
// play after it stops replays from the first panel, same as a finished
// video. Presentational only: the app resolves each panel's URI (e.g. via
// useMediaUri) and passes the plain ordered array in, so this stays free of
// app/network concerns.
//
// Optional narration (`narrate`): reads each panel's step text aloud via
// on-device TTS (expo-speech) as it becomes current, with a mute toggle
// alongside play/pause. `steps` supplies real per-panel text + a minimum
// hold time; omit it and placeholder text ("Hold for Ns.") is generated
// instead, so the experience works before any real step content exists.
// Either way, each panel's dwell time = its narration's estimated length,
// THEN its hold time — "hold for 2 seconds" means the panel stays up for 2
// more seconds once the narrator finishes saying that, not that the 2
// seconds elapsed while it was being said. (Never shrinks below
// `intervalMs`.) The point is following along hands-free without the
// narrator getting cut off, or the hold ending before it's said.
export function PanelCarousel({
  uris,
  aspectRatio = 1,
  style,
  autoPlay = true,
  active = true,
  intervalMs = DEFAULT_INTERVAL_MS,
  steps,
  narrate = false,
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
  // Baseline dwell time per panel, in ms — also the floor when `steps`/
  // `narrate` would otherwise compute a shorter duration.
  intervalMs?: number;
  // Per-panel step text + minimum hold time, parallel to `uris`. Optional
  // per-index — a missing entry (or the whole prop) falls back to placeholder
  // text and DEFAULT_HOLD_SECONDS. Only takes effect (pacing panels beyond
  // plain `intervalMs`) when this or `narrate` is set.
  steps?: PanelStep[];
  // Reads each step's text aloud as its panel becomes current, and adds a
  // mute toggle. Off by default — most call sites (previews, edit sheets)
  // shouldn't narrate; opt in where the viewer is actually following along
  // hands-free.
  narrate?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const canPlay = uris.length > 1;

  // Only resolved (and only adds pacing beyond plain intervalMs) when the
  // caller actually asked for it — everything below falls straight back to
  // the pre-existing uniform-intervalMs behaviour otherwise, so every call
  // site that doesn't pass `steps`/`narrate` is unaffected.
  const resolvedSteps = useMemo<ResolvedStep[] | null>(() => {
    if (!narrate && !steps) return null;
    return uris.map((_, i) => {
      const s = steps?.[i];
      const holdSeconds = s?.holdSeconds ?? DEFAULT_HOLD_SECONDS;
      const text = s?.text ?? `Hold for ${holdSeconds} second${holdSeconds === 1 ? '' : 's'}.`;
      return { text, holdSeconds };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narrate, steps ? JSON.stringify(steps) : null, uris.length]);

  // Cumulative panel-start times. Panel i's own dwell time is at least
  // intervalMs, and — only when resolvedSteps is active — stretched to fit
  // its holdSeconds PLUS (when narrating) its estimated narration length —
  // additive, not "whichever is longer": the hold is the time AFTER the
  // narrator finishes speaking ("hold for 2 seconds" should mean the panel
  // stays up 2 more seconds once that sentence is done, not that the 2
  // seconds already elapsed while it was being said).
  const boundaries = useMemo(() => {
    const b = [0];
    for (let i = 0; i < uris.length; i++) {
      let duration = intervalMs;
      if (resolvedSteps) {
        const { text, holdSeconds } = resolvedSteps[i];
        const holdMs = holdSeconds * 1000;
        const narrationMs = narrate ? estimateSpeechMs(text) / NARRATION_RATE + NARRATION_BUFFER_MS : 0;
        duration = Math.max(intervalMs, holdMs + narrationMs);
      }
      b.push(b[i] + duration);
    }
    return b;
  }, [uris.length, resolvedSteps, narrate, intervalMs]);
  const totalMs = boundaries[boundaries.length - 1] || intervalMs;

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
      Speech.stop();
    },
    [],
  );

  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barWidthRef = useRef(0);
  const dragStartXRef = useRef(0);
  // Set right before a replay-triggered play starts, consumed by the
  // auto-hide effect below to use REPLAY_AUTO_HIDE_MS instead of the normal
  // CONTROLS_AUTO_HIDE_MS — after tapping replay the viewer just interacted
  // with the button, so there's no need to keep it up as long as after a
  // tap-to-reveal.
  const fastHideRef = useRef(false);
  const [muted, setMuted] = useState(false);
  // Index whose narration has already been spoken (or -1). Compared against
  // the current index each tick so a given panel is only narrated once per
  // visit, not on every render while sitting on it.
  const narratedIndexRef = useRef(-1);
  // Best available voice identifier, looked up once per mount (only when
  // narrating). expo-speech's default voice is the flattest one available on
  // most devices; an "Enhanced"-quality English voice, where the OS has one
  // installed, sounds materially less robotic. undefined (never found, or
  // lookup unsupported/failed) just falls back to the system default voice —
  // narration still works, it's only the tone that's worse.
  const preferredVoiceRef = useRef<string | undefined>(undefined);
  const voiceLookupDoneRef = useRef(false);
  useEffect(() => {
    if (!narrate || voiceLookupDoneRef.current) return;
    voiceLookupDoneRef.current = true;
    Speech.getAvailableVoicesAsync()
      .then((voices) => {
        const enhanced = voices.find(
          (v) => v.quality === Speech.VoiceQuality.Enhanced && v.language?.startsWith('en'),
        );
        preferredVoiceRef.current = enhanced?.identifier;
      })
      .catch(() => {
        // No lookup support on this platform/OEM build — system default voice.
      });
  }, [narrate]);

  // Controls fade in/out rather than popping — same as native video chrome.
  // Kept mounted throughout (see the render below) so there's something to
  // animate; pointerEvents flips to 'none' immediately on hide, ahead of the
  // fade finishing, so an invisible button can't still catch a stray tap.
  const controlsOpacity = useRef(new Animated.Value(controlsVisible ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(controlsOpacity, {
      toValue: controlsVisible ? 1 : 0,
      duration: CONTROLS_FADE_MS,
      useNativeDriver: true,
    }).start();
  }, [controlsVisible, controlsOpacity]);

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
    controlsOpacity.setValue(startPlaying ? 0 : 1); // snap, don't fade, on a fresh sequence
    opacity0.setValue(1);
    opacity1.setValue(0);
    activeSlotRef.current = 0;
    shownIndexRef.current = 0;
    pendingRef.current = null;
    fastHideRef.current = false;
    narratedIndexRef.current = -1;
    Speech.stop();
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
    const targetIndex = indexForElapsed(elapsedMs, boundaries);
    if (targetIndex === shownIndexRef.current || pendingRef.current?.index === targetIndex) return;
    const nextSlot: Slot = activeSlotRef.current === 0 ? 1 : 0;
    pendingRef.current = { slot: nextSlot, index: targetIndex };
    setSlotUris((prev) => {
      const next: [string | null, string | null] = [prev[0], prev[1]];
      next[nextSlot] = uris[targetIndex];
      return next;
    });
  }, [elapsedMs, boundaries, uris, canPlay]);

  // Narrates the current panel's step text once per visit, while actually
  // playing/active/unmuted. Duration pacing (boundaries, above) is precomputed
  // rather than driven by this, so a slower-than-estimated read never gets cut
  // off mid-panel — it just means the estimate undershot for that one step.
  useEffect(() => {
    if (!narrate || !resolvedSteps || !isPlaying || !active || muted) return;
    const idx = indexForElapsed(elapsedMs, boundaries);
    if (narratedIndexRef.current === idx) return;
    narratedIndexRef.current = idx;
    Speech.stop();
    Speech.speak(resolvedSteps[idx].text, { rate: NARRATION_RATE, voice: preferredVoiceRef.current });
  }, [elapsedMs, narrate, resolvedSteps, isPlaying, active, muted, boundaries]);

  // Cuts narration off immediately on pause/background/mute, rather than
  // waiting for the utterance to finish on its own.
  useEffect(() => {
    if (!narrate) return;
    if (!isPlaying || !active || muted) Speech.stop();
  }, [narrate, isPlaying, active, muted]);

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
    const delay = fastHideRef.current ? REPLAY_AUTO_HIDE_MS : CONTROLS_AUTO_HIDE_MS;
    fastHideRef.current = false;
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), delay);
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
      fastHideRef.current = true;
      narratedIndexRef.current = -1;
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

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      if (next) {
        Speech.stop();
      } else {
        // Re-narrate whatever panel is current instead of leaving it silent
        // until the next panel change.
        narratedIndexRef.current = -1;
      }
      return next;
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
    const targetIndex = indexForElapsed(targetMs, boundaries);
    setIsPlaying(false);
    setControlsVisible(true);
    Speech.stop();
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
                  backgroundColor: PANEL_BACKGROUND_COLOR,
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
              {/* Play/pause button only — fades with the rest of the chrome.
                  The timeline (below) is intentionally NOT inside this layer:
                  it stays visible and scrubbable throughout playback, same as
                  a persistent video progress bar, rather than disappearing
                  along with the play button. */}
              <Animated.View
                testID={testID ? `${testID}-controls` : undefined}
                pointerEvents={controlsVisible ? 'box-none' : 'none'}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  opacity: controlsOpacity,
                }}
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
                {narrate && (
                  <Pressable
                    testID={testID ? `${testID}-mute` : undefined}
                    onPress={toggleMute}
                    accessibilityRole="button"
                    accessibilityLabel={muted ? 'Unmute' : 'Mute'}
                    style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: 'rgba(0,0,0,0.45)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name={muted ? 'volume-mute' : 'volume-high'} size="md" color="inverse" />
                  </Pressable>
                )}
              </Animated.View>
              <View
                testID={testID ? `${testID}-timeline` : undefined}
                onLayout={onBarLayout}
                {...panResponder.panHandlers}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 28,
                  justifyContent: 'center',
                  paddingHorizontal: 12,
                }}
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
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}
