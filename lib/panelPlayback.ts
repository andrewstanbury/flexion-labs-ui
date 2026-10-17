import { NARRATION_RATE, narrationMs } from './panelTiming';

// The panel player's playback model, as a pure reducer — no React, no timers,
// no audio. PanelCarousel feeds it user actions and clock ticks and renders
// what it says; narrationIntent() turns its state into the ONE thing the
// narrator should be doing right now, which NarrationDriver then makes true.
//
// Why a pure model: narration used to be started and stopped by scattered
// effects and handlers sharing "already narrated" refs, and every new control
// (restart, scrub, skip, speed) found another way to desync them. Here every
// control is a state transition, narration is a function of state, and both
// are testable exhaustively — including randomized action sequences.

export const SPEEDS = [1, 0.75, 1.5] as const;
export type Speed = (typeof SPEEDS)[number];

/** Panel i occupies [boundaries[i], boundaries[i+1]); the last entry is the total. */
export type Boundaries = readonly number[];

export function totalMs(boundaries: Boundaries): number {
  return boundaries[boundaries.length - 1] ?? 0;
}

export function panelAt(ms: number, boundaries: Boundaries): number {
  for (let i = 0; i < boundaries.length - 1; i++) {
    if (ms < boundaries[i + 1]) return i;
  }
  return Math.max(boundaries.length - 2, 0);
}

export type PlaybackState = {
  elapsedMs: number;
  playing: boolean;
  speed: Speed;
  muted: boolean;
  /** Finger down on the timeline: playback is held, narration silent. */
  scrubbing: boolean;
  resumeAfterScrub: boolean;
  /**
   * Bumps on every discontinuity — anything other than the clock running on
   * its own: play, seek, skip, scrub, restart, speed, unmute, resync, reset.
   * Narration is keyed on it, so each discontinuity restarts the narrator at
   * the right point exactly once.
   */
  generation: number;
  /** Where narration starts for this generation: the panel and the offset into it. */
  anchor: { panel: number; offsetMs: number };
  /**
   * The narration take the clock is waiting for, or null. A recording that
   * has not audibly started yet holds the clock — as a video holds while it
   * buffers — so the panel can never move on before (or while) its narrator
   * speaks. Cleared by `narrationStarted`, any discontinuity, or a pause.
   */
  awaiting: string | null;
};

export type PlaybackAction =
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'toggle' }
  | { type: 'restart' }
  | { type: 'tick'; ms: number }
  | { type: 'seek'; ms: number }
  | { type: 'step'; delta: number }
  | { type: 'scrubStart'; ms: number }
  | { type: 'scrubMove'; ms: number }
  | { type: 'scrubEnd' }
  | { type: 'cycleSpeed' }
  | { type: 'setMuted'; muted: boolean }
  /** Re-anchor narration at the current point (e.g. narration was suppressed and is allowed again). */
  | { type: 'resync' }
  /** The timeline's durations changed (e.g. a recording failed and fell back to speech). */
  | { type: 'retime' }
  /** A new sequence: back to the start, playing iff autoPlay. */
  | { type: 'reset'; autoPlay: boolean }
  /** The narrator was told to play this take; hold the clock until it starts. */
  | { type: 'awaitNarration'; key: string }
  /** That take is audibly playing (or was given up on): run the clock. */
  | { type: 'narrationStarted'; key: string };

export function initialPlayback(autoPlay: boolean): PlaybackState {
  return {
    elapsedMs: 0,
    playing: autoPlay,
    speed: 1,
    muted: false,
    scrubbing: false,
    resumeAfterScrub: false,
    generation: 0,
    anchor: { panel: 0, offsetMs: 0 },
    awaiting: null,
  };
}

export function atEnd(state: PlaybackState, boundaries: Boundaries): boolean {
  return state.elapsedMs >= totalMs(boundaries);
}

// Moves the playhead as a discontinuity: new generation, narration anchored
// at the landing point.
function jump(state: PlaybackState, ms: number, boundaries: Boundaries, playing: boolean): PlaybackState {
  const total = totalMs(boundaries);
  const elapsedMs = Math.max(0, Math.min(ms, total));
  const panel = panelAt(elapsedMs, boundaries);
  return {
    ...state,
    elapsedMs,
    // Landing exactly on the end cannot play; there is nothing left.
    playing: playing && elapsedMs < total,
    generation: state.generation + 1,
    anchor: { panel, offsetMs: elapsedMs - (boundaries[panel] ?? 0) },
    awaiting: null,
  };
}

// Controls a person presses while not dragging the timeline. Each one ends a
// scrub that is still marked as in progress — a drag whose release was lost
// (gesture cancelled by the OS) must not leave the player stuck silent.
const ENDS_SCRUB = new Set<PlaybackAction['type']>(['play', 'pause', 'toggle', 'restart', 'seek', 'step']);

export function reducePlayback(state: PlaybackState, action: PlaybackAction, boundaries: Boundaries): PlaybackState {
  const total = totalMs(boundaries);
  if (state.scrubbing && ENDS_SCRUB.has(action.type)) {
    state = { ...state, scrubbing: false, resumeAfterScrub: false };
  }
  switch (action.type) {
    case 'tick': {
      if (!state.playing || state.scrubbing || state.awaiting !== null || action.ms <= 0) return state;
      const elapsedMs = Math.min(state.elapsedMs + action.ms * state.speed, total);
      const panel = panelAt(elapsedMs, boundaries);
      const before = panelAt(state.elapsedMs, boundaries);
      return {
        ...state,
        elapsedMs,
        playing: elapsedMs < total,
        // A natural advance starts the next panel's line from its beginning:
        // the clock moves in steps and lands a little past the boundary, which
        // must not clip or skip the line.
        anchor: panel !== before ? { panel, offsetMs: 0 } : state.anchor,
      };
    }
    case 'play':
      if (state.playing) return state;
      // Finished — replay from the start, same as a finished video.
      if (state.elapsedMs >= total) return jump(state, 0, boundaries, true);
      return jump(state, state.elapsedMs, boundaries, true);
    case 'pause':
      return state.playing ? { ...state, playing: false, awaiting: null } : state;
    case 'toggle':
      return reducePlayback(state, { type: state.playing ? 'pause' : 'play' }, boundaries);
    case 'restart':
      return jump(state, 0, boundaries, true);
    case 'seek':
      return jump(state, action.ms, boundaries, state.playing);
    case 'step': {
      // Index `panels` is the end itself: next on the last panel finishes the
      // sequence exactly as playing through would (stopped, replay offered),
      // and previous from the end lands on the last panel.
      const panels = boundaries.length - 1;
      const from = state.elapsedMs >= total ? panels : panelAt(state.elapsedMs, boundaries);
      const target = Math.max(0, Math.min(from + action.delta, panels));
      return jump(state, boundaries[target] ?? 0, boundaries, state.playing);
    }
    case 'scrubStart':
      return {
        ...jump(state, action.ms, boundaries, false),
        scrubbing: true,
        resumeAfterScrub: state.scrubbing ? state.resumeAfterScrub : state.playing,
      };
    case 'scrubMove':
      if (!state.scrubbing) return state;
      return { ...jump(state, action.ms, boundaries, false), scrubbing: true };
    case 'scrubEnd': {
      if (!state.scrubbing) return state;
      const released = { ...state, scrubbing: false, resumeAfterScrub: false };
      return state.resumeAfterScrub && state.elapsedMs < total
        ? jump(released, state.elapsedMs, boundaries, true)
        : released;
    }
    case 'cycleSpeed': {
      const speed = SPEEDS[(SPEEDS.indexOf(state.speed) + 1) % SPEEDS.length];
      return { ...jump(state, state.elapsedMs, boundaries, state.playing), speed };
    }
    case 'setMuted':
      if (state.muted === action.muted) return state;
      return action.muted
        ? { ...state, muted: true, awaiting: null }
        : { ...jump(state, state.elapsedMs, boundaries, state.playing), muted: false };
    case 'resync':
    case 'retime':
      return { ...jump(state, state.elapsedMs, boundaries, state.playing), scrubbing: state.scrubbing };
    case 'reset':
      return { ...initialPlayback(action.autoPlay), speed: state.speed, generation: state.generation + 1 };
    case 'awaitNarration':
      return state.playing && !state.scrubbing && state.awaiting !== action.key
        ? { ...state, awaiting: action.key }
        : state;
    case 'narrationStarted':
      return state.awaiting === action.key ? { ...state, awaiting: null } : state;
  }
}

// ── Narration intent ─────────────────────────────────────────────────────

export type NarrationStep = { text: string; audioUrl?: string; audioDurationMs?: number };

export type NarrationIntent =
  | { kind: 'silent'; key: string }
  | { kind: 'clip'; key: string; url: string; startMs: number; rate: number }
  | { kind: 'speech'; key: string; text: string; rate: number };

/**
 * What the narrator should be doing right now. `key` identifies one narration
 * "take": it stays the same while the clock runs within a panel and changes
 * on a panel change or any discontinuity — the driver acts only on a change.
 *
 * `enabled` is false when narration is off, the player is not visible
 * (`active`), or a screen reader is running (it reads the panels itself).
 */
export function narrationIntent(
  state: PlaybackState,
  boundaries: Boundaries,
  steps: readonly NarrationStep[] | null | undefined,
  enabled: boolean,
): NarrationIntent {
  if (!enabled || !steps || !state.playing || state.muted || state.scrubbing) {
    return { kind: 'silent', key: 'off' };
  }
  const panel = panelAt(state.elapsedMs, boundaries);
  const step = steps[panel];
  const take = `${state.generation}:${panel}`;
  if (!step) return { kind: 'silent', key: `${take}:none` };
  const startMs = state.anchor.panel === panel ? state.anchor.offsetMs : 0;
  if (step.audioUrl) {
    // Past the end of this panel's recording: nothing left to say until the
    // next panel, as when scrubbing a video past a line.
    if (step.audioDurationMs !== undefined && startMs >= step.audioDurationMs) {
      return { kind: 'silent', key: `${take}:after-clip` };
    }
    return { kind: 'clip', key: `${take}:clip:${step.audioUrl}`, url: step.audioUrl, startMs, rate: state.speed };
  }
  // On-device speech cannot start mid-sentence: re-read the line when early
  // in it; past the halfway mark, wait for the next panel rather than run the
  // line over into the next panel's time.
  if (startMs > 0 && startMs >= narrationMs(step) / 2) {
    return { kind: 'silent', key: `${take}:after-speech` };
  }
  return { kind: 'speech', key: `${take}:speech`, text: step.text, rate: NARRATION_RATE * state.speed };
}
