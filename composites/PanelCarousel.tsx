import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
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
// The design-system Text, not RN's — the clock readout inherits the same font
// scaling and variant ramp as every other label in both apps.
import { Text } from '../primitives/Text';
import { useTheme } from '../UIProvider';

const DEFAULT_INTERVAL_MS = 1800;
const FADE_MS = 900;
const TICK_MS = 100;
const CONTROLS_AUTO_HIDE_MS = 2500;
const REPLAY_AUTO_HIDE_MS = 800;
const CONTROLS_FADE_MS = 250;
// The beat AFTER the narrator stops, before the panel changes — not the total
// time a panel is shown (see the boundaries calc: hold is ADDED to the
// narration estimate, not the greater of the two). Two seconds read as dead
// air between steps once real narration replaced the placeholder text; one is
// enough to take the picture in without the sequence stalling.
//
// Not lower than this: the narration estimate leans long on purpose, and
// trimming the hold too far starts eating the margin that stops a panel
// changing while the narrator is still talking.
const DEFAULT_HOLD_SECONDS = 1;
// Conservative (slower-than-typical) reading pace, so the ESTIMATE of how
// long narration will take leans long rather than short — better to hold a
// panel a beat too long than cut the narrator off mid-sentence. Duration is
// estimated up front rather than measured from a live TTS callback so the
// timeline/seek math stays fully deterministic (and testable without a real
// speech engine); NARRATION_BUFFER_MS below adds extra margin on top.
const WORDS_PER_MINUTE = 130;
const NARRATION_BUFFER_MS = 200;
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

// Player chrome sits on a FIXED dark scrim (rgba(0,0,0,0.45)) in both schemes,
// so its foreground must be fixed too. These used to use the `inverse` role,
// which resolves to `theme.surface` — a DARK colour in dark mode, i.e. a dark
// icon on a dark scrim, leaving no way to tell playing from paused. A themed
// colour is simply wrong here: nothing about this scrim follows the theme.
const ON_SCRIM_COLOR = '#FFFFFF';
const ON_SCRIM_MUTED_COLOR = 'rgba(255,255,255,0.7)';
const SCRIM_BACKGROUND = 'rgba(0,0,0,0.45)';

// Playback speeds, cycled by tapping the speed chip. 1 first so the initial
// tap slows down rather than speeding up — the common reason to touch this on
// an exercise you are trying to follow.
const SPEEDS = [1, 0.75, 1.5] as const;
type Speed = (typeof SPEEDS)[number];

// mm:ss for the elapsed/total readout. Panel sequences are seconds-to-minutes,
// never hours, so no hour component.
function formatClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// The scrubber's draggable dot. Big enough to see against a busy panel and to
// read as grabbable, without covering the 3px bar it rides on.
const HANDLE_SIZE = 14;

// Secondary chrome buttons (skip, restart, mute, speed) — one shape so they
// read as a set rather than four slightly different circles.
const SCRIM_BUTTON_SM = {
  minWidth: 40,
  height: 40,
  paddingHorizontal: 10,
  borderRadius: 20,
  backgroundColor: SCRIM_BACKGROUND,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

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

  // VoiceOver/TalkBack changes two things here: (1) our own on-device
  // narration is suppressed — having it AND the screen reader both talking
  // is worse than either alone, and VoiceOver reading each control's own
  // accessibilityLabel already covers the same information; (2) controls
  // stay permanently visible/interactive instead of auto-hiding, because
  // pointerEvents:'none' (how hidden controls are made untappable) also
  // blocks VoiceOver's own double-tap activation — the auto-hide/tap-to-
  // reveal pattern is fundamentally a sighted-user affordance.
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      if (mounted) setScreenReaderEnabled(enabled);
    });
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReaderEnabled);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  useEffect(() => {
    if (screenReaderEnabled) setControlsVisible(true);
  }, [screenReaderEnabled]);

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

  // Speed scales the CLOCK, not the boundaries. Rescaling `boundaries`/`totalMs`
  // would invalidate every seek position and the progress fraction the moment
  // speed changed; advancing elapsed time faster leaves all of that math in
  // one canonical "natural time" frame. The TTS rate is multiplied by the same
  // factor below, so the narrator and the panels stay locked together — change
  // one without the other and the voice drifts out of sync with the images.
  const [speed, setSpeed] = useState<Speed>(1);
  const speedRef = useRef<Speed>(1);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  // Re-speak the current panel at the new rate rather than letting the
  // in-flight utterance finish at the old one.
  // Side effects stay OUT of the updater: React may defer or double-invoke a
  // state updater, so a Speech.stop() in there is not ordered against the
  // narration effect that re-speaks at the new rate — the utterance kept
  // playing at the old speed while the panels ran at the new one, which is
  // precisely the desync this control has to avoid.
  const cycleSpeed = () => {
    narratedIndexRef.current = -1;
    Speech.stop();
    setSpeed((prev) => SPEEDS[(SPEEDS.indexOf(prev) + 1) % SPEEDS.length]);
  };

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
      elapsedRef.current = Math.min(elapsedRef.current + TICK_MS * speedRef.current, totalMs);
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
    if (!narrate || !resolvedSteps || !isPlaying || !active || muted || screenReaderEnabled) return;
    const idx = indexForElapsed(elapsedMs, boundaries);
    if (narratedIndexRef.current === idx) return;
    narratedIndexRef.current = idx;
    Speech.stop();
    Speech.speak(resolvedSteps[idx].text, {
      // Same factor the clock uses, so the narrator finishes a panel's text in
      // the same proportion of that panel's (now shorter/longer) dwell time.
      rate: NARRATION_RATE * speed,
      voice: preferredVoiceRef.current,
      // iOS: without this, speech rides whatever audio session the REST of
      // the app happens to have active — silently inaudible wherever nothing
      // else (e.g. an expo-video player, even a muted one) has activated
      // one. false makes expo-speech create and manage its own dedicated
      // session, so narration is audible on its own, not just when a
      // PanelCarousel happens to share a screen with a video player.
      useApplicationAudioSession: false,
    });
  }, [elapsedMs, narrate, resolvedSteps, isPlaying, active, muted, screenReaderEnabled, boundaries, speed]);

  // Cuts narration off immediately on pause/background/mute/screen-reader,
  // rather than waiting for the utterance to finish on its own.
  useEffect(() => {
    if (!narrate) return;
    if (!isPlaying || !active || muted || screenReaderEnabled) Speech.stop();
  }, [narrate, isPlaying, active, muted, screenReaderEnabled]);

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
  // native video chrome; stays up while paused, the whole time if the viewer
  // never plays, or permanently under a screen reader (see screenReaderEnabled
  // above — hidden controls would be unreachable, not just invisible).
  useEffect(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (!controlsVisible || !isPlaying || screenReaderEnabled) return;
    const delay = fastHideRef.current ? REPLAY_AUTO_HIDE_MS : CONTROLS_AUTO_HIDE_MS;
    fastHideRef.current = false;
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), delay);
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [controlsVisible, isPlaying, screenReaderEnabled]);

  if (uris.length === 0) return null;

  const atEnd = shownIndexRef.current >= uris.length - 1 && elapsedMs >= totalMs;
  const iconName = isPlaying ? 'pause' : atEnd ? 'refresh' : 'play';
  const progress = totalMs > 0 ? Math.min(elapsedMs / totalMs, 1) : 0;

  // Rewind to the first panel. Shared by the replay-on-finish path in
  // togglePlay and the explicit restart button, so both land identically —
  // two copies of this slot/opacity juggling would be two places to drift.
  const rewindToStart = () => {
    fastHideRef.current = true;
    narratedIndexRef.current = -1;
    Speech.stop();
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
  };

  const togglePlay = () => {
    if (!canPlay) return;
    // Finished — replay from the first panel, same as a finished video.
    if (!isPlaying && atEnd) rewindToStart();
    setControlsVisible(true);
    setIsPlaying((playing) => !playing);
  };

  const restart = () => {
    if (!canPlay) return;
    rewindToStart();
    setControlsVisible(true);
    setIsPlaying(true);
  };

  // Reveal if hidden. If already visible, hide only while actually playing —
  // paused controls stay pinned up (there's no other way back to play).
  // No-op under a screen reader: controls are pinned visible there (see
  // screenReaderEnabled above), so there's nothing to reveal/hide.
  const handleContentTap = () => {
    if (!canPlay || screenReaderEnabled) return;
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

  // Applies a seek's landing spot: which panel is now current (a hard cut,
  // not a crossfade — shared by both the drag-scrub below and the
  // accessibility increment/decrement action, which resolve targetIndex/
  // targetMs differently but land the same way).
  const applyTargetIndex = (targetIndex: number, targetMs: number) => {
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
    applyTargetIndex(indexForElapsed(targetMs, boundaries), targetMs);
  };

  // The VoiceOver/TalkBack "adjustable" increment/decrement action — jumps a
  // whole panel at a time (unlike the drag above, which tracks the exact
  // finger position) and announces the landing panel's own text via the
  // screen reader's own channel, not our suppressed on-device narrator (see
  // screenReaderEnabled above — running both would talk over each other).
  const seekToIndex = (targetIndex: number) => {
    const clamped = Math.max(0, Math.min(targetIndex, uris.length - 1));
    applyTargetIndex(clamped, boundaries[clamped]);
    if (screenReaderEnabled) {
      const label = resolvedSteps?.[clamped]?.text ?? `Panel ${clamped + 1} of ${uris.length}`;
      AccessibilityInfo.announceForAccessibility(label);
    }
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

  const handleTimelineAccessibilityAction = (event: { nativeEvent: { actionName: string } }) => {
    const current = indexForElapsed(elapsedMs, boundaries);
    if (event.nativeEvent.actionName === 'increment') seekToIndex(current + 1);
    else if (event.nativeEvent.actionName === 'decrement') seekToIndex(current - 1);
  };

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
                // Decorative: narration/the timeline's own label already
                // convey the content, and two crossfading copies of "the
                // same image" both being screen-reader-focusable is
                // confusing, not helpful.
                accessible={false}
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
              // Pinned-visible controls under a screen reader make this
              // tap-to-reveal surface meaningless — drop it from the
              // accessibility tree so VoiceOver/TalkBack navigation goes
              // straight to the actual controls instead of stopping on an
              // unlabeled full-screen region first.
              accessible={!screenReaderEnabled}
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
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 16,
                  }}
                >
                  <Pressable
                    testID={testID ? `${testID}-prev` : undefined}
                    onPress={() => seekToIndex(indexForElapsed(elapsedMs, boundaries) - 1)}
                    accessibilityRole="button"
                    accessibilityLabel="Previous panel"
                  >
                    <View style={SCRIM_BUTTON_SM}>
                      <Icon name="play-skip-back" size="md" color={ON_SCRIM_COLOR} />
                    </View>
                  </Pressable>
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
                        backgroundColor: SCRIM_BACKGROUND,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon name={iconName} size="lg" color={ON_SCRIM_COLOR} />
                    </View>
                  </Pressable>
                  <Pressable
                    testID={testID ? `${testID}-next` : undefined}
                    onPress={() => seekToIndex(indexForElapsed(elapsedMs, boundaries) + 1)}
                    accessibilityRole="button"
                    accessibilityLabel="Next panel"
                  >
                    <View style={SCRIM_BUTTON_SM}>
                      <Icon name="play-skip-forward" size="md" color={ON_SCRIM_COLOR} />
                    </View>
                  </Pressable>
                </View>
                {/* Restart, separate from play/pause. Play already replays once
                    the sequence has ended, but only THEN — this restarts from
                    anywhere, which is what a reviewer re-watching a movement
                    actually wants. */}
                <Pressable
                  testID={testID ? `${testID}-restart` : undefined}
                  onPress={restart}
                  accessibilityRole="button"
                  accessibilityLabel="Restart from the beginning"
                  style={{ position: 'absolute', top: 12, left: 12 }}
                >
                  <View style={SCRIM_BUTTON_SM}>
                    <Icon name="refresh" size="md" color={ON_SCRIM_COLOR} />
                  </View>
                </Pressable>
                <View
                  pointerEvents="box-none"
                  style={{ position: 'absolute', top: 12, right: 12, flexDirection: 'row', gap: 8 }}
                >
                  <Pressable
                    testID={testID ? `${testID}-speed` : undefined}
                    onPress={cycleSpeed}
                    accessibilityRole="button"
                    accessibilityLabel={`Playback speed ${speed}x`}
                  >
                    <View style={SCRIM_BUTTON_SM}>
                      <Text variant="caption" style={{ color: ON_SCRIM_COLOR, fontWeight: '700' }}>
                        {speed}×
                      </Text>
                    </View>
                  </Pressable>
                  {narrate && (
                    <Pressable
                      testID={testID ? `${testID}-mute` : undefined}
                      onPress={toggleMute}
                      accessibilityRole="button"
                      accessibilityLabel={muted ? 'Unmute' : 'Mute'}
                    >
                      <View style={SCRIM_BUTTON_SM}>
                        <Icon
                          name={muted ? 'volume-mute' : 'volume-high'}
                          size="md"
                          color={ON_SCRIM_COLOR}
                        />
                      </View>
                    </Pressable>
                  )}
                </View>
              </Animated.View>
              <View
                testID={testID ? `${testID}-timeline` : undefined}
                onLayout={onBarLayout}
                {...panResponder.panHandlers}
                accessible
                accessibilityRole="adjustable"
                accessibilityLabel="Playback progress"
                accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
                accessibilityActions={[
                  { name: 'increment', label: 'Next step' },
                  { name: 'decrement', label: 'Previous step' },
                ]}
                onAccessibilityAction={handleTimelineAccessibilityAction}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  // Taller than the 3px bar so the drag target and the handle
                  // both have room — the bar is what you see, this is what you
                  // can actually hit.
                  height: 40,
                  justifyContent: 'center',
                  paddingHorizontal: 12,
                }}
              >
                <View style={{ height: HANDLE_SIZE, justifyContent: 'center' }}>
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
                  {/* The draggable dot. Percentage-positioned with a
                      half-handle negative margin so it centres ON the progress
                      point rather than starting at it — otherwise it reads as
                      permanently ahead of the fill, and sits half off-screen at
                      both ends. pointerEvents none: the parent owns the
                      PanResponder, and a handle that swallowed touches would
                      make the bar dead exactly where the finger lands. */}
                  <View
                    testID={testID ? `${testID}-timeline-handle` : undefined}
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      left: `${progress * 100}%`,
                      marginLeft: -HANDLE_SIZE / 2,
                      width: HANDLE_SIZE,
                      height: HANDLE_SIZE,
                      borderRadius: HANDLE_SIZE / 2,
                      backgroundColor: theme.accentStrong,
                      borderWidth: 2,
                      borderColor: ON_SCRIM_COLOR,
                    }}
                  />
                </View>
                <View
                  pointerEvents="none"
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingTop: 2,
                  }}
                >
                  <Text variant="caption" style={{ color: ON_SCRIM_COLOR }}>
                    {formatClock(elapsedMs)}
                  </Text>
                  <Text variant="caption" style={{ color: ON_SCRIM_MUTED_COLOR }}>
                    {formatClock(totalMs)}
                  </Text>
                </View>
              </View>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}
