import {
  atEnd,
  initialPlayback,
  narrationIntent,
  panelAt,
  reducePlayback,
  totalMs,
  type NarrationIntent,
  type NarrationStep,
  type PlaybackAction,
  type PlaybackState,
} from '../lib/panelPlayback';
import { NarrationDriver, type NarrationBackend } from '../lib/narrationDriver';
import { NARRATION_RATE } from '../lib/panelTiming';

// Three panels: A (recorded, 4s), B (on-device speech), C (recorded, 3s).
const B = [0, 4700, 7000, 10700];
const STEPS: NarrationStep[] = [
  { text: 'Stand tall holding a chair.', audioUrl: 'a.mp3', audioDurationMs: 4000 },
  { text: 'Rise onto your toes and hold.' },
  { text: 'Lower slowly.', audioUrl: 'c.mp3', audioDurationMs: 3000 },
];

const run = (actions: PlaybackAction[], start = initialPlayback(true)) =>
  actions.reduce((s, a) => reducePlayback(s, a, B), start);
const intent = (s: PlaybackState, steps = STEPS, enabled = true) => narrationIntent(s, B, steps, enabled);

describe('panelPlayback — the playback model', () => {
  it('starts at 0, playing only when autoPlay', () => {
    expect(initialPlayback(true)).toMatchObject({ elapsedMs: 0, playing: true });
    expect(initialPlayback(false).playing).toBe(false);
  });

  it('the clock advances only while playing, scaled by speed, and stops at the end', () => {
    expect(run([{ type: 'pause' }, { type: 'tick', ms: 500 }]).elapsedMs).toBe(0);
    expect(run([{ type: 'tick', ms: 500 }]).elapsedMs).toBe(500);
    expect(run([{ type: 'cycleSpeed' }, { type: 'tick', ms: 1000 }]).elapsedMs).toBe(750);
    const ended = run([{ type: 'tick', ms: 20000 }]);
    expect(ended.elapsedMs).toBe(totalMs(B));
    expect(ended.playing).toBe(false);
  });

  it('play after the end replays from the start', () => {
    const s = run([{ type: 'tick', ms: 20000 }, { type: 'play' }]);
    expect(s).toMatchObject({ elapsedMs: 0, playing: true });
  });

  it('every discontinuity bumps the generation; the running clock does not', () => {
    const s0 = initialPlayback(true);
    expect(run([{ type: 'tick', ms: 100 }], s0).generation).toBe(s0.generation);
    for (const a of [
      { type: 'restart' },
      { type: 'seek', ms: 3000 },
      { type: 'step', delta: 1 },
      { type: 'cycleSpeed' },
      { type: 'resync' },
    ] as PlaybackAction[]) {
      expect(run([a], s0).generation).toBe(s0.generation + 1);
    }
  });

  it('seek keeps the play state; landing anchors narration at the offset into the panel', () => {
    const s = run([{ type: 'seek', ms: 5500 }]);
    expect(s).toMatchObject({ elapsedMs: 5500, playing: true, anchor: { panel: 1, offsetMs: 800 } });
    expect(run([{ type: 'pause' }, { type: 'seek', ms: 5500 }]).playing).toBe(false);
  });

  it('previous/next jump to a panel start, clamp at the ends, and keep playing', () => {
    expect(run([{ type: 'step', delta: 1 }])).toMatchObject({ elapsedMs: 4700, playing: true });
    expect(run([{ type: 'seek', ms: 8000 }, { type: 'step', delta: -1 }]).elapsedMs).toBe(4700);
    expect(run([{ type: 'step', delta: -1 }]).elapsedMs).toBe(0);
    expect(run([{ type: 'seek', ms: 8000 }, { type: 'step', delta: 5 }]).elapsedMs).toBe(totalMs(B));
  });

  it('next on the last panel goes to the end, as playing through would — not back to its start', () => {
    const end = run([{ type: 'seek', ms: 7500 }, { type: 'step', delta: 1 }]);
    expect(end).toMatchObject({ elapsedMs: totalMs(B), playing: false });
    expect(atEnd(end, B)).toBe(true);
    expect(intent(end).kind).toBe('silent');
    // Next again stays at the end; previous from the end is the last panel.
    expect(reducePlayback(end, { type: 'step', delta: 1 }, B).elapsedMs).toBe(totalMs(B));
    expect(reducePlayback(end, { type: 'step', delta: -1 }, B).elapsedMs).toBe(7000);
    // Play from there replays from the start, like a finished video.
    expect(reducePlayback(end, { type: 'play' }, B)).toMatchObject({ elapsedMs: 0, playing: true });
  });

  it('a recording that has not started yet holds the clock, like a video buffering', () => {
    const s0 = initialPlayback(true);
    const waiting = reducePlayback(s0, { type: 'awaitNarration', key: 'k1' }, B);
    expect(waiting.awaiting).toBe('k1');
    expect(reducePlayback(waiting, { type: 'tick', ms: 1000 }, B).elapsedMs).toBe(0);
    // A start for another take does not release it; this take's does.
    expect(reducePlayback(waiting, { type: 'narrationStarted', key: 'old' }, B).awaiting).toBe('k1');
    const running = reducePlayback(waiting, { type: 'narrationStarted', key: 'k1' }, B);
    expect(running.awaiting).toBeNull();
    expect(reducePlayback(running, { type: 'tick', ms: 1000 }, B).elapsedMs).toBe(1000);
  });

  it('pausing, muting or any jump drops the hold; nothing waits while paused or scrubbing', () => {
    const waiting = reducePlayback(initialPlayback(true), { type: 'awaitNarration', key: 'k' }, B);
    for (const a of [
      { type: 'pause' },
      { type: 'setMuted', muted: true },
      { type: 'seek', ms: 3000 },
      { type: 'step', delta: 1 },
      { type: 'restart' },
      { type: 'scrubStart', ms: 100 },
    ] as PlaybackAction[]) {
      expect(reducePlayback(waiting, a, B).awaiting).toBeNull();
    }
    expect(reducePlayback(initialPlayback(false), { type: 'awaitNarration', key: 'k' }, B).awaiting).toBeNull();
    const scrubbing = run([{ type: 'scrubStart', ms: 100 }]);
    expect(reducePlayback(scrubbing, { type: 'awaitNarration', key: 'k' }, B).awaiting).toBeNull();
    expect(reducePlayback(waiting, { type: 'awaitNarration', key: 'k' }, B)).toBe(waiting);
  });

  it('scrubbing holds playback while the finger is down and resumes after if it was playing', () => {
    const down = run([{ type: 'scrubStart', ms: 1000 }, { type: 'scrubMove', ms: 6000 }]);
    expect(down).toMatchObject({ playing: false, scrubbing: true, elapsedMs: 6000 });
    expect(reducePlayback(down, { type: 'tick', ms: 500 }, B).elapsedMs).toBe(6000);
    expect(reducePlayback(down, { type: 'scrubEnd' }, B)).toMatchObject({ playing: true, scrubbing: false });
    const paused = run([{ type: 'pause' }, { type: 'scrubStart', ms: 1000 }, { type: 'scrubEnd' }]);
    expect(paused.playing).toBe(false);
  });

  it('any explicit control ends a scrub whose release was lost', () => {
    const stuck = run([{ type: 'scrubStart', ms: 3000 }]);
    expect(reducePlayback(stuck, { type: 'restart' }, B)).toMatchObject({ scrubbing: false, playing: true, elapsedMs: 0 });
    expect(reducePlayback(stuck, { type: 'toggle' }, B)).toMatchObject({ scrubbing: false, playing: true });
  });

  it('a new sequence resets position and play state but keeps the chosen speed', () => {
    const s = run([{ type: 'cycleSpeed' }, { type: 'seek', ms: 6000 }, { type: 'reset', autoPlay: true }]);
    expect(s).toMatchObject({ elapsedMs: 0, playing: true, speed: 0.75, anchor: { panel: 0, offsetMs: 0 } });
  });
});

describe('narrationIntent — what the narrator should be doing', () => {
  it('plays the recording from 0 on load', () => {
    expect(intent(initialPlayback(true))).toMatchObject({ kind: 'clip', url: 'a.mp3', startMs: 0, rate: 1 });
  });

  it('is silent while paused, muted, scrubbing or disabled', () => {
    expect(intent(run([{ type: 'pause' }])).kind).toBe('silent');
    expect(intent(run([{ type: 'setMuted', muted: true }])).kind).toBe('silent');
    expect(intent(run([{ type: 'scrubStart', ms: 100 }])).kind).toBe('silent');
    expect(intent(initialPlayback(true), STEPS, false).kind).toBe('silent');
  });

  it('keeps the same take while the clock runs within a panel', () => {
    const a = intent(run([{ type: 'tick', ms: 100 }]));
    const b = intent(run([{ type: 'tick', ms: 2000 }]));
    expect(a.key).toBe(b.key);
  });

  it('a natural advance starts the next panel from 0 even when the tick overshoots', () => {
    const s = run([{ type: 'tick', ms: 4000 }, { type: 'tick', ms: 900 }]); // lands at 4900, 200ms into B
    expect(intent(s)).toMatchObject({ kind: 'speech', text: STEPS[1].text });
    const s2 = run([{ type: 'seek', ms: 6800 }, { type: 'tick', ms: 400 }]); // natural advance into C
    expect(intent(s2)).toMatchObject({ kind: 'clip', url: 'c.mp3', startMs: 0 });
  });

  it('resume continues the recording from the paused point', () => {
    const s = run([{ type: 'tick', ms: 1500 }, { type: 'pause' }, { type: 'play' }]);
    expect(intent(s)).toMatchObject({ kind: 'clip', url: 'a.mp3', startMs: 1500 });
  });

  it('past the end of a recording, stays silent until the next panel', () => {
    expect(intent(run([{ type: 'seek', ms: 4300 }])).kind).toBe('silent');
  });

  it('speech re-reads the line early in a panel and waits late in it', () => {
    expect(intent(run([{ type: 'seek', ms: 4800 }]))).toMatchObject({ kind: 'speech' });
    expect(intent(run([{ type: 'seek', ms: 6900 }])).kind).toBe('silent');
  });

  it('speech and recordings follow the playback speed', () => {
    const slow = run([{ type: 'cycleSpeed' }]);
    expect(intent(slow)).toMatchObject({ kind: 'clip', rate: 0.75 });
    expect(intent(reducePlayback(slow, { type: 'seek', ms: 4700 }, B))).toMatchObject({
      kind: 'speech',
      rate: NARRATION_RATE * 0.75,
    });
  });

  it('restart and previous always give a new take, so a clip is restarted, never left as-is', () => {
    const s = run([{ type: 'tick', ms: 1000 }]);
    expect(intent(reducePlayback(s, { type: 'restart' }, B)).key).not.toBe(intent(s).key);
    expect(intent(reducePlayback(s, { type: 'step', delta: -1 }, B)).key).not.toBe(intent(s).key);
  });

  it('a recording that failed (step without audio) switches the take to speech', () => {
    const s = initialPlayback(true);
    const failed = [{ text: STEPS[0].text }, STEPS[1], STEPS[2]];
    expect(intent(s, failed).kind).toBe('speech');
    expect(intent(s, failed).key).not.toBe(intent(s).key);
  });
});

// ── Driver ───────────────────────────────────────────────────────────────

// A simulated narrator. startClip is the sequencer's contract: the clip plays
// from startMs (buffering and command order are ClipBank's job, tested in
// clipBank.test.ts). A clip that runs to its end parks there.
function fakeBackend() {
  const log: string[] = [];
  const st = {
    speech: null as string | null,
    clip: { url: null as string | null, pos: 0, playing: false, rate: 1, loaded: false },
  };
  const backend: NarrationBackend = {
    speak: (text, rate) => { st.speech = text; log.push(`speak:${text}@${rate}`); },
    stopSpeech: () => { st.speech = null; },
    startClip: (url, startMs, rate) => {
      st.clip = { url, pos: startMs / 1000, playing: true, rate, loaded: true };
      log.push(`play:${url}@${startMs / 1000}`);
    },
    stopClip: () => { st.clip.playing = false; },
  };
  return { backend, st, log };
}

describe('NarrationDriver', () => {
  const clip = (key: string, url: string, startMs: number): NarrationIntent => ({ kind: 'clip', key, url, startMs, rate: 1 });

  it('ignores a repeat of the current take', () => {
    const f = fakeBackend();
    const d = new NarrationDriver(f.backend);
    d.apply(clip('1', 'a.mp3', 0));
    d.apply(clip('1', 'a.mp3', 0));
    expect(f.log.filter((l) => l.startsWith('play'))).toHaveLength(1);
  });

  it('a clip starts where the intent says', () => {
    const f = fakeBackend();
    new NarrationDriver(f.backend).apply(clip('1', 'c.mp3', 900));
    expect(f.log).toEqual(['play:c.mp3@0.9']);
  });

  it('the same clip as a new take starts again — never left parked at its end', () => {
    const f = fakeBackend();
    const d = new NarrationDriver(f.backend);
    d.apply(clip('1', 'a.mp3', 0));
    f.st.clip.pos = 4; // played to the end
    d.apply(clip('2', 'a.mp3', 0));
    expect(f.log).toEqual(['play:a.mp3@0', 'play:a.mp3@0']);
  });

  it('reset stops both channels and lets the same take run again', () => {
    const f = fakeBackend();
    const d = new NarrationDriver(f.backend);
    d.apply(clip('1', 'a.mp3', 0));
    d.reset();
    expect(f.st.clip.playing).toBe(false);
    expect(d.currentKey).toBeNull();
    d.apply(clip('1', 'a.mp3', 0));
    expect(f.st.clip.playing).toBe(true);
  });

  it('stops the other channel when switching between speech and a clip', () => {
    const f = fakeBackend();
    const d = new NarrationDriver(f.backend);
    d.apply({ kind: 'speech', key: '1', text: 'Hi', rate: 1 });
    expect(f.st.speech).toBe('Hi');
    d.apply(clip('2', 'a.mp3', 0));
    expect(f.st.speech).toBeNull();
    expect(f.st.clip.playing).toBe(true);
    d.apply({ kind: 'silent', key: '3' });
    expect(f.st.clip.playing).toBe(false);
  });

  it('after a failure the same take re-applies (as speech) instead of being skipped', () => {
    const f = fakeBackend();
    const d = new NarrationDriver(f.backend);
    d.apply(clip('1', 'a.mp3', 0));
    d.clipFailed();
    d.apply({ kind: 'speech', key: '1:speech', text: 'Stand', rate: 1 });
    expect(f.st.speech).toBe('Stand');
  });
});

// ── Randomized: any sequence of controls keeps the narrator correct ─────

function prng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function randomAction(r: () => number): PlaybackAction {
  const total = totalMs(B);
  const pick = r();
  if (pick < 0.45) return { type: 'tick', ms: [16, 100, 250, 1000][Math.floor(r() * 4)] };
  const options: PlaybackAction[] = [
    { type: 'toggle' },
    { type: 'restart' },
    { type: 'seek', ms: Math.floor(r() * total) },
    { type: 'step', delta: r() < 0.5 ? -1 : 1 },
    { type: 'scrubStart', ms: Math.floor(r() * total) },
    { type: 'scrubMove', ms: Math.floor(r() * total) },
    { type: 'scrubEnd' },
    { type: 'cycleSpeed' },
    { type: 'setMuted', muted: r() < 0.5 },
    { type: 'resync' },
  ];
  return options[Math.floor(r() * options.length)];
}

describe('randomized control sequences', () => {
  it('hold every narration invariant across 400 random sequences', () => {
    for (let seed = 1; seed <= 400; seed++) {
      const r = prng(seed);
      const f = fakeBackend();
      const d = new NarrationDriver(f.backend);
      let s = initialPlayback(r() < 0.8);
      const history: PlaybackAction[] = [];
      d.apply(intent(s));
      for (let step = 0; step < 80; step++) {
        let action = randomAction(r);
        // The component holds the clock for each recording until it starts.
        const pick = r();
        if (pick < 0.08) action = { type: 'awaitNarration', key: intent(s).key };
        else if (pick < 0.14) action = { type: 'narrationStarted', key: s.awaiting ?? 'none' };
        history.push(action);
        const prev = s;
        s = reducePlayback(s, action, B);
        const before = f.log.length;
        const want = intent(s);
        d.apply(want);
        // The fake clip runs with the clock, and parks at its end.
        if (action.type === 'tick' && f.st.clip.playing && f.st.clip.url) {
          const dur = (f.st.clip.url === 'a.mp3' ? 4000 : 3000) / 1000;
          f.st.clip.pos = Math.min(f.st.clip.pos + (action.ms * s.speed) / 1000, dur);
        }
        const fail = (msg: string) => {
          throw new Error(`seed ${seed}, after ${JSON.stringify(history)}: ${msg}`);
        };
        const panel = panelAt(s.elapsedMs, B);
        // 1. One voice at most.
        if (f.st.speech && f.st.clip.playing) fail('speech and a clip at once');
        // 2. Silent whenever playback is held.
        if ((!s.playing || s.muted || s.scrubbing) && (f.st.speech || f.st.clip.playing)) {
          fail('narrating while paused, muted or scrubbing');
        }
        // 3. Whatever is narrating belongs to the current panel.
        if (f.st.clip.playing && f.st.clip.url !== STEPS[panel].audioUrl) fail(`clip ${f.st.clip.url} on panel ${panel}`);
        if (f.st.speech && f.st.speech !== STEPS[panel].text) fail(`speech for the wrong panel ${panel}`);
        // 4. Any clip started by this step starts where the intent says.
        const started = f.log.slice(before).find((l) => l.startsWith('play:'));
        if (started && want.kind === 'clip') {
          const at = Number(started.split('@')[1]);
          if (Math.abs(at - want.startMs / 1000) > 1e-9) fail(`clip started at ${at}, wanted ${want.startMs / 1000}`);
        }
        // 5. A restart while narrating starts panel 0 from its beginning.
        if (action.type === 'restart' && !s.muted && s.playing) {
          if (!started || !started.startsWith('play:a.mp3@0')) fail('restart did not replay the first clip from 0');
        }
        // 6. A natural advance into a recorded panel starts its clip from 0.
        if (action.type === 'tick' && panelAt(prev.elapsedMs, B) !== panel && want.kind === 'clip') {
          if (!started || !started.endsWith('@0')) fail('natural advance did not start the clip at 0');
        }
        if (s.elapsedMs < 0 || s.elapsedMs > totalMs(B)) fail('clock out of range');
        // 7. A held clock does not move, and nothing is held while stopped.
        if (action.type === 'tick' && prev.awaiting !== null && s.elapsedMs !== prev.elapsedMs) fail('clock ran while held');
        if (s.awaiting !== null && (!s.playing || s.scrubbing)) fail('held while paused or scrubbing');
      }
    }
  });
});
