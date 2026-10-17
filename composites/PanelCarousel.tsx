import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
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
import { narrationMs } from '../lib/panelTiming';
import {
  initialPlayback,
  narrationIntent,
  panelAt,
  reducePlayback,
  type PlaybackAction,
  type PlaybackState,
} from '../lib/panelPlayback';
import { NarrationDriver, type NarrationBackend } from '../lib/narrationDriver';
import { ClipBank, type BankPlayer } from '../lib/clipBank';
import { resolveNarrationFile } from '../lib/narrationFiles';

// expo-audio is loaded on first use, never at import time. index.ts re-exports
// this file, so a top-level import would load the native module for every
// consumer of the package — every screen of both apps, and their jest runs —
// and a native module that throws on import takes all of them down at once.
// Without it, recorded narration falls back to expo-speech like any other
// playback failure.
type ExpoAudio = typeof import('expo-audio');
let expoAudio: ExpoAudio | null | undefined;
function loadExpoAudio(): ExpoAudio | null {
  if (expoAudio === undefined) {
    try {
      expoAudio = require('expo-audio') as ExpoAudio;
    } catch {
      expoAudio = null;
    }
  }
  return expoAudio;
}

// Narrator log for development builds (Expo Go / dev client): every narration
// decision and native audio/speech call, so a glitch seen on a device can be
// read back from the Metro log rather than guessed at. Silent in tests and in
// release builds.
const narratorLog = (...parts: unknown[]) => {
  if (typeof __DEV__ !== 'undefined' && __DEV__ && process.env.NODE_ENV !== 'test') {
    console.log('[narrator]', ...parts);
  }
};

// iOS drops an utterance spoken immediately after the previous one was
// stopped (AVSpeechSynthesizer finishes stopping asynchronously). Speech that
// follows a stop within this window waits it out.
const SPEECH_RESTART_GAP_MS = 150;
// The longest the clock waits for a recording to start (buffering included)
// before its panel gives up on it and narrates with speech instead. Recordings
// are fetched when the player mounts, so this is only reached on a dead
// network or a broken file — never in normal playback.
const NARRATION_WAIT_LIMIT_MS = 8000;
// The clock waiting for its recording only shows a spinner past this, so a
// normal start (tens of milliseconds from a local file) shows nothing.
const BUFFERING_SPINNER_DELAY_MS = 300;

const DEFAULT_INTERVAL_MS = 1800;
const FADE_MS = 900;
const TICK_MS = 100;
const CONTROLS_AUTO_HIDE_MS = 2500;
const REPLAY_AUTO_HIDE_MS = 800;
const CONTROLS_FADE_MS = 250;
// The beat AFTER the narrator stops, before the panel changes — not the total
// time a panel is shown (see the boundaries calc: hold is ADDED to the
// narration estimate, not the greater of the two). Two seconds read as dead
// air once real narration replaced the placeholder text, then one still did.
//
// 0.5 is a DELIBERATE override of the "not lower than one" note that used to
// sit here (owner call, 2026-08-11: the pause still read as a stall on
// device). Keep the trade-off visible rather than deleting the warning:
// the real gap is this PLUS NARRATION_BUFFER_MS, and the whole thing rides on
// an ESTIMATE of speech length, not a callback from the speech engine. When
// that estimate undershoots — an unusually long word, a slower voice, a
// locale we did not tune WORDS_PER_MINUTE for — this is the margin that stops
// the panel changing mid-sentence. Shortening it spends that margin.
//
// If narration starts getting clipped, raise this back toward 1 before
// touching WORDS_PER_MINUTE: the estimate is shared with the seek/timeline
// math, so it is the more expensive knob to move.
const DEFAULT_HOLD_SECONDS = 0.5;
// WORDS_PER_MINUTE, NARRATION_BUFFER_MS and NARRATION_RATE live in
// lib/panelTiming.ts with the rest of the (pure, unit-tested) timing math.
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
// Playback speeds (1x, 0.75x, 1.5x) live with the playback model in
// lib/panelPlayback.ts; tapping the speed chip cycles them.

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
// Horizontal padding of the timeline's touch area; the bar itself sits inside it.
const TIMELINE_PADDING = 12;

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
  // Pre-generated narration for this panel (the pipeline's recorded narrator
  // voice). When present it is played instead of on-device TTS, and its
  // measured length replaces the word-count estimate in the panel timing.
  // Both optional: a step without audio narrates via expo-speech as before.
  audioUrl?: string;
  audioDurationMs?: number;
};

type ResolvedStep = { text: string; holdSeconds: number; audioUrl?: string; audioDurationMs?: number };

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
  // Recordings that failed to load or play this mount (expired signed URL,
  // network error, player error status). Keyed by URL. A failed step is
  // resolved WITHOUT its audio, so it narrates via TTS and its panel timing
  // falls back to the word-count estimate — never a silent, overlong panel.
  const [failedAudioUrls, setFailedAudioUrls] = useState<string[]>([]);

  const resolvedSteps = useMemo<ResolvedStep[] | null>(() => {
    if (!narrate && !steps) return null;
    return uris.map((_, i) => {
      const s = steps?.[i];
      const holdSeconds = s?.holdSeconds ?? DEFAULT_HOLD_SECONDS;
      // Placeholder narration for a panel with no step text. Keeps the
      // original "Hold for N seconds." wording (owner call, 2026-08-11), but
      // ROUNDED to whole seconds and floored at 1.
      //
      // The rounding is the point: this interpolates holdSeconds into SPOKEN
      // output, so when DEFAULT_HOLD_SECONDS dropped to 0.5 the narrator
      // started saying "Hold for 0.5 seconds." Rounding decouples what is said
      // from the exact tuning value while keeping the sentence intact — retune
      // the timing freely and the narration stays natural.
      const spokenHold = Math.max(1, Math.round(holdSeconds));
      const text = s?.text ?? `Hold for ${spokenHold} second${spokenHold === 1 ? '' : 's'}.`;
      const audioOk = s?.audioUrl && !failedAudioUrls.includes(s.audioUrl);
      return audioOk
        ? { text, holdSeconds, audioUrl: s?.audioUrl, audioDurationMs: s?.audioDurationMs }
        : { text, holdSeconds };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narrate, steps ? JSON.stringify(steps) : null, uris.length, failedAudioUrls]);

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
        const { holdSeconds } = resolvedSteps[i];
        const holdMs = holdSeconds * 1000;
        const spokenMs = narrate ? narrationMs(resolvedSteps[i]) : 0;
        duration = Math.max(intervalMs, holdMs + spokenMs);
      }
      b.push(b[i] + duration);
    }
    return b;
  }, [uris.length, resolvedSteps, narrate, intervalMs]);
  const totalMs = boundaries[boundaries.length - 1] || intervalMs;

  // ── Playback ────────────────────────────────────────────────────────────
  // The whole playback model — clock, play/pause, seek, skip, scrub, speed,
  // mute — is the pure reducer in lib/panelPlayback.ts. This component only
  // feeds it actions and ticks, renders its state, and lets NarrationDriver
  // make the narrator match narrationIntent(). Nothing else may start or stop
  // narration; that rule is what keeps the narrator in sync (see the tests in
  // __tests__/panelPlayback.test.ts, including randomized control sequences).
  const boundariesRef = useRef(boundaries);
  boundariesRef.current = boundaries;
  const [pb, dispatch] = useReducer(
    (s: PlaybackState, a: PlaybackAction) => reducePlayback(s, a, boundariesRef.current),
    autoPlay && canPlay,
    initialPlayback,
  );
  const pbRef = useRef(pb);
  pbRef.current = pb;
  const elapsedMs = Math.min(pb.elapsedMs, totalMs);
  const isPlaying = pb.playing;
  const speed = pb.speed;
  const muted = pb.muted;

  const [controlsVisible, setControlsVisible] = useState(!(autoPlay && canPlay));
  // Bumped on every control press so the auto-hide countdown restarts: a
  // countdown that ran from when the controls first appeared hid them mid
  // tapping, and the next tap landed on the wrong thing.
  const [controlsPoke, setControlsPoke] = useState(0);
  const pokeControls = () => {
    setControlsVisible(true);
    setControlsPoke((n) => n + 1);
  };

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

  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barWidthRef = useRef(0);
  const dragStartXRef = useRef(0);
  // Set right before a replay-triggered play starts, consumed by the
  // auto-hide effect below to use REPLAY_AUTO_HIDE_MS instead of the normal
  // CONTROLS_AUTO_HIDE_MS — after tapping replay the viewer just interacted
  // with the button, so there's no need to keep it up as long as after a
  // tap-to-reveal.
  const fastHideRef = useRef(false);
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

  // ── Narration plumbing: expo-speech + a ClipBank of preloaded recordings ──
  // The latest intent, for handlers that run outside render (bank events).
  const intentRef = useRef<ReturnType<typeof narrationIntent>>({ kind: 'silent', key: 'init' });
  const audioModeSetRef = useRef(false);
  // playsInSilentMode mirrors what useApplicationAudioSession:false buys
  // expo-speech: without it the iPhone ring/silent switch mutes the narrator.
  // Set as soon as there are recordings (not when the first one starts — the
  // mode change is asynchronous, and the first clip used to start muted).
  const ensureAudioMode = (audio: ExpoAudio) => {
    if (audioModeSetRef.current) return;
    audioModeSetRef.current = true;
    audio.setAudioModeAsync({ playsInSilentMode: true }).catch(() => {
      // Audio session unavailable — playback still attempts.
    });
  };
  // Gives up on a recording for this mount: its panel narrates via speech and
  // its timing falls back to the word-count estimate (the timeline retimes).
  const failClip = (url: string | null) => {
    if (!url || !mountedRef.current) return;
    narratorLog('clip failed for good', url);
    if (intentRef.current.kind === 'clip' && intentRef.current.url === url) driver.clipFailed();
    setFailedAudioUrls((prev) => (prev.includes(url) ? prev : [...prev, url]));
  };
  // One bank per mount: every recording gets its own player, buffered before
  // its panel comes up (see lib/clipBank.ts).
  const bankRef = useRef<ClipBank | null>(null);
  if (!bankRef.current) {
    bankRef.current = new ClipBank({
      resolve: resolveNarrationFile,
      createPlayer: (uri): BankPlayer => {
        const audio = loadExpoAudio();
        if (!audio) throw new Error('expo-audio unavailable');
        ensureAudioMode(audio);
        return audio.createAudioPlayer(
          { uri },
          // Frequent status updates: "playing" is what starts the clock.
          // keepAudioSessionActive: pausing one clip must not tear down the
          // audio session the next clip is about to need — reactivating it
          // is a audible delay on iOS.
          { updateInterval: 100, keepAudioSessionActive: true },
        ) as unknown as BankPlayer;
      },
      onStarted: (url) => {
        const current = intentRef.current;
        if (current.kind === 'clip' && current.url === url) dispatch({ type: 'narrationStarted', key: current.key });
      },
      onFailed: (url) => failClip(url),
      log: narratorLog,
    });
  }
  const speechStartedRef = useRef(false);
  const lastSpeechStopRef = useRef(-Infinity);
  const speechTokenRef = useRef(0);
  const driverRef = useRef<NarrationDriver | null>(null);
  if (!driverRef.current) {
    const backend: NarrationBackend = {
      speak: (text, rate) => {
        const token = speechTokenRef.current;
        const start = () => {
          // A newer stop (another take) since this was scheduled: drop it.
          if (token !== speechTokenRef.current || !mountedRef.current) return;
          narratorLog('speak', JSON.stringify(text), `rate=${rate.toFixed(2)}`);
          speechStartedRef.current = true;
          Speech.speak(text, {
            rate,
            voice: preferredVoiceRef.current,
            // iOS: without this, speech rides whatever audio session the REST
            // of the app happens to have active — silently inaudible wherever
            // nothing else has activated one. false makes expo-speech manage
            // its own session, so narration is audible on its own.
            useApplicationAudioSession: false,
            // A line that finished on its own needs no restart gap before
            // the next panel's line.
            onDone: () => {
              if (token === speechTokenRef.current) speechStartedRef.current = false;
            },
          });
        };
        const sinceStop = Date.now() - lastSpeechStopRef.current;
        if (sinceStop < SPEECH_RESTART_GAP_MS) setTimeout(start, SPEECH_RESTART_GAP_MS - sinceStop);
        else start();
      },
      stopSpeech: () => {
        speechTokenRef.current += 1;
        // Only a real stop opens the restart gap; stopping silence is free.
        if (speechStartedRef.current) {
          speechStartedRef.current = false;
          lastSpeechStopRef.current = Date.now();
        }
        Speech.stop();
      },
      startClip: (url, startMs, rate) => bankRef.current?.play(url, startMs / 1000, rate),
      stopClip: () => bankRef.current?.stop(),
    };
    driverRef.current = new NarrationDriver(backend);
  }
  const driver = driverRef.current;

  useEffect(() => {
    // Set on (re)mount too: development StrictMode runs effects twice, and a
    // false left by the first cleanup silenced every later narration.
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      driverRef.current?.reset();
      bankRef.current?.dispose();
      bankRef.current = null;
    };
  }, []);

  // Buffer every recording as soon as the player mounts — before the viewer
  // presses play, and long before later panels come up — and prepare the
  // audio session with them.
  const recordingUrls = narrate ? (resolvedSteps ?? []).flatMap((st) => (st.audioUrl ? [st.audioUrl] : [])) : [];
  const recordingsKey = recordingUrls.join('|');
  useEffect(() => {
    if (recordingUrls.length) {
      const audio = loadExpoAudio();
      if (audio) ensureAudioMode(audio);
    }
    bankRef.current?.prepare(recordingUrls);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingsKey]);

  // Narration is allowed while visible and no screen reader is speaking.
  const narrationEnabled = narrate && active && !screenReaderEnabled;
  const intent = narrationIntent(pb, boundaries, narrate ? resolvedSteps : null, narrationEnabled);
  intentRef.current = intent;
  useEffect(() => {
    narratorLog(
      'take',
      intent.key,
      intent.kind,
      intent.kind === 'clip' ? `${intent.url} from ${(intent.startMs / 1000).toFixed(2)}s` : '',
      `@${(pb.elapsedMs / 1000).toFixed(2)}s`,
    );
    // A recording holds the clock until it is audibly playing. Dispatched
    // BEFORE apply: a clip that reports "playing" synchronously releases the
    // hold in the same order.
    if (intent.kind === 'clip') dispatch({ type: 'awaitNarration', key: intent.key });
    // Anything else (speech, silence — e.g. a screen reader turned on, or
    // the player went off-screen) never holds the clock.
    else if (pbRef.current.awaiting) dispatch({ type: 'narrationStarted', key: pbRef.current.awaiting });
    try {
      driver.apply(intent);
    } catch (error) {
      // The native player refused the source outright — speak it instead.
      narratorLog('apply threw', error);
      if (intent.kind === 'clip') failClip(intent.url);
    }
    // The key identifies the take; the rest of the intent is fixed for it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent.key]);

  // Backstop for the hold: a recording that has not started in
  // NARRATION_WAIT_LIMIT_MS is given up on and its panel spoken instead, so
  // the player can never sit waiting forever. The spinner appears only if the
  // wait is long enough to notice.
  const [buffering, setBuffering] = useState(false);
  useEffect(() => {
    if (!pb.awaiting) {
      setBuffering(false);
      return;
    }
    const waitingFor = intentRef.current;
    const spinner = setTimeout(() => setBuffering(true), BUFFERING_SPINNER_DELAY_MS);
    const awaiting = pb.awaiting;
    const limit = setTimeout(() => {
      narratorLog('narration did not start in time', awaiting);
      const current = intentRef.current;
      if (current.kind === 'clip' && current.key === waitingFor.key) failClip(current.url);
      dispatch({ type: 'narrationStarted', key: awaiting });
    }, NARRATION_WAIT_LIMIT_MS);
    return () => {
      clearTimeout(spinner);
      clearTimeout(limit);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pb.awaiting]);

  // Coming back into view (or a screen reader turning off) picks narration up
  // at the current point rather than where it was suppressed.
  const enabledRef = useRef(narrationEnabled);
  useEffect(() => {
    if (narrationEnabled && !enabledRef.current) dispatch({ type: 'resync' });
    enabledRef.current = narrationEnabled;
  }, [narrationEnabled]);

  // A recording that failed changes the timeline (its panel falls back to the
  // speech estimate): re-anchor the playhead against the new durations.
  const boundariesKey = boundaries.join(',');
  const boundariesKeyRef = useRef(boundariesKey);
  useEffect(() => {
    if (boundariesKeyRef.current === boundariesKey) return;
    boundariesKeyRef.current = boundariesKey;
    dispatch({ type: 'retime' });
  }, [boundariesKey]);

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
  const firstSequenceRef = useRef(true);
  useEffect(() => {
    const startPlaying = autoPlay && canPlay;
    if (!firstSequenceRef.current) {
      driver.reset();
      setFailedAudioUrls([]);
      dispatch({ type: 'reset', autoPlay: startPlaying });
    }
    firstSequenceRef.current = false;
    setControlsVisible(!startPlaying);
    controlsOpacity.setValue(startPlaying ? 0 : 1); // snap, don't fade, on a fresh sequence
    opacity0.setValue(1);
    opacity1.setValue(0);
    activeSlotRef.current = 0;
    shownIndexRef.current = 0;
    pendingRef.current = null;
    fastHideRef.current = false;
    setSlotUris([uris[0] ?? null, null]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uris.join('|')]);

  // Playback clock. One interval while playing; the reducer owns the time, so
  // a seek can never be overwritten by a tick computed from a stale position.
  const ticking = isPlaying && active && canPlay && !pb.scrubbing;
  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => dispatch({ type: 'tick', ms: TICK_MS }), TICK_MS);
    return () => clearInterval(id);
  }, [ticking]);

  const atEnd = elapsedMs >= totalMs;
  // Finished: show the replay button, as a video does.
  useEffect(() => {
    if (atEnd && !isPlaying) setControlsVisible(true);
  }, [atEnd, isPlaying]);

  // A discontinuity (seek, skip, scrub, restart, reset) is an instant cut to
  // the landing panel — scrubbing a video doesn't dissolve between frames.
  // Declared before the crossfade effect so a cut wins over a fade.
  useEffect(() => {
    if (!canPlay) return;
    const target = panelAt(elapsedMs, boundaries);
    if (target === shownIndexRef.current) return;
    pendingRef.current = null;
    const slot = activeSlotRef.current;
    setSlotUris((prev) => {
      const next: [string | null, string | null] = [prev[0], prev[1]];
      next[slot] = uris[target];
      return next;
    });
    opacities[slot].setValue(1);
    opacities[slot === 0 ? 1 : 0].setValue(0);
    shownIndexRef.current = target;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pb.generation]);

  // A natural advance crossfades: load the next panel into the other slot;
  // handleSlotLoad starts the fade once it's decoded.
  useEffect(() => {
    if (!canPlay) return;
    const targetIndex = panelAt(elapsedMs, boundaries);
    if (targetIndex === shownIndexRef.current || pendingRef.current?.index === targetIndex) return;
    const nextSlot: Slot = activeSlotRef.current === 0 ? 1 : 0;
    pendingRef.current = { slot: nextSlot, index: targetIndex };
    setSlotUris((prev) => {
      const next: [string | null, string | null] = [prev[0], prev[1]];
      next[nextSlot] = uris[targetIndex];
      return next;
    });
  }, [elapsedMs, boundaries, uris, canPlay]);

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
  }, [controlsVisible, isPlaying, screenReaderEnabled, controlsPoke]);

  // Scrubbing. The PanResponder is created ONCE and calls through a ref to
  // the latest handlers: one rebuilt every render (and the timeline re-renders
  // on every move) lost its gesture state mid-drag, so the playhead jumped.
  const timelineX = (x: number) => {
    const inner = barWidthRef.current - TIMELINE_PADDING * 2;
    if (inner <= 0) return 0;
    return Math.max(0, Math.min(1, (x - TIMELINE_PADDING) / inner)) * totalMs;
  };
  const scrubHandlersRef = useRef({ start: (_x: number) => {}, move: (_x: number) => {}, end: () => {} });
  scrubHandlersRef.current = {
    start: (x) => {
      if (barWidthRef.current <= 0) return;
      userAction({ type: 'scrubStart', ms: timelineX(x) });
    },
    move: (x) => {
      if (barWidthRef.current <= 0) return;
      dispatch({ type: 'scrubMove', ms: timelineX(x) });
    },
    end: () => userAction({ type: 'scrubEnd' }),
  };
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Keep the drag: a parent scroll view stealing it mid-scrub would leave
      // playback held with no release to resume it.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e: GestureResponderEvent) => {
        dragStartXRef.current = e.nativeEvent.locationX;
        scrubHandlersRef.current.start(e.nativeEvent.locationX);
      },
      onPanResponderMove: (_e: GestureResponderEvent, gesture: PanResponderGestureState) =>
        scrubHandlersRef.current.move(dragStartXRef.current + gesture.dx),
      onPanResponderRelease: () => scrubHandlersRef.current.end(),
      onPanResponderTerminate: () => scrubHandlersRef.current.end(),
    }),
  ).current;

  if (uris.length === 0) return null;

  const iconName = isPlaying ? 'pause' : atEnd ? 'refresh' : 'play';
  const progress = totalMs > 0 ? Math.min(elapsedMs / totalMs, 1) : 0;

  // Every viewer action goes through here: logged (so a device log shows what
  // was pressed before a glitch) and restarting the controls' auto-hide.
  const userAction = (action: PlaybackAction) => {
    narratorLog('action', action.type, `@${(pb.elapsedMs / 1000).toFixed(2)}s`, isPlaying ? 'playing' : 'paused');
    pokeControls();
    dispatch(action);
  };

  const togglePlay = () => {
    if (!canPlay) return;
    if (!isPlaying && atEnd) fastHideRef.current = true;
    userAction({ type: 'toggle' });
  };

  const restart = () => {
    if (!canPlay) return;
    fastHideRef.current = true;
    userAction({ type: 'restart' });
  };

  const cycleSpeed = () => userAction({ type: 'cycleSpeed' });
  const toggleMute = () => userAction({ type: 'setMuted', muted: !muted });

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

  // Previous/next and the screen reader's increment/decrement: a whole panel
  // at a time, keeping play state (a video's skip doesn't pause). Under a
  // screen reader the landing panel is announced through its own channel.
  const stepBy = (delta: number) => {
    userAction({ type: 'step', delta });
    if (screenReaderEnabled) {
      const landing = Math.max(0, Math.min(panelAt(elapsedMs, boundaries) + delta, uris.length - 1));
      const label = resolvedSteps?.[landing]?.text ?? `Panel ${landing + 1} of ${uris.length}`;
      AccessibilityInfo.announceForAccessibility(label);
    }
  };

  const onBarLayout = (e: { nativeEvent: { layout: { width: number } } }) => {
    barWidthRef.current = e.nativeEvent.layout.width;
  };

  const handleTimelineAccessibilityAction = (event: { nativeEvent: { actionName: string } }) => {
    if (event.nativeEvent.actionName === 'increment') stepBy(1);
    else if (event.nativeEvent.actionName === 'decrement') stepBy(-1);
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
          {buffering && isPlaying ? (
            // The narrator is still buffering and the clock is holding for it,
            // as a video shows a spinner while it buffers.
            <View
              pointerEvents="none"
              testID={testID ? `${testID}-buffering` : undefined}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}
            >
              <View style={{ padding: 12, borderRadius: 999, backgroundColor: SCRIM_BACKGROUND }}>
                <ActivityIndicator color={ON_SCRIM_COLOR} accessibilityLabel="Loading narration" />
              </View>
            </View>
          ) : null}
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
                    onPress={() => stepBy(-1)}
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
                    onPress={() => stepBy(1)}
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
                  paddingHorizontal: TIMELINE_PADDING,
                }}
              >
                {/* pointerEvents none on everything inside: touches must land
                    on the timeline view itself, so locationX is measured from
                    the same origin whichever part of the bar is touched. */}
                <View pointerEvents="none" style={{ height: HANDLE_SIZE, justifyContent: 'center' }}>
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
