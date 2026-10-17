// Runs the native audio player's commands in order, for one clip at a time.
//
// expo-audio's replace() is asynchronous on iOS: a play() issued before the
// new source is ready is silently dropped, and right after replace() the
// player can still report the OLD source as loaded. Narrator logs from a
// device showed exactly that — "load narration_2, play" followed by
// loaded=true playing=false and no sound — whenever next/previous was pressed.
//
// So each start is a small state machine driven by the player's own status
// events, never by assumptions about timing:
//
//   replace(url) → wait for this source to load (an unloaded status, then a
//   loaded one; or a timeout) → seekTo(start) → play() → confirm playing,
//   pressing play again once if it did not start.
//
// Every start takes a new token; anything still pending from an older start
// is dropped when it fires. Synchronous and timer-based (no promises), so it
// behaves the same under test as on a device.

export type SequencedPlayer = {
  replace(source: { uri: string }): void;
  seekTo(seconds: number): unknown;
  setPlaybackRate(rate: number): void;
  play(): void;
  pause(): void;
};

export type ClipStatus = { isLoaded?: boolean; playing?: boolean; error?: unknown };

type Timers = {
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (id: unknown) => void;
};

export type ClipSequencerOptions = {
  /** Proceed anyway if the player never confirms the new source (ms). */
  loadTimeoutMs?: number;
  /** How long to wait for "playing" before pressing play again (ms). */
  confirmMs?: number;
  /** Rapid starts closer together than this are coalesced (ms). */
  settleMs?: number;
  log?: (...parts: unknown[]) => void;
  timers?: Timers;
  now?: () => number;
};

type Pending = { token: number; url: string; startSec: number; rate: number };

export class ClipSequencer {
  private token = 0;
  private loadedUrl: string | null = null;
  private ready = false;
  private sawUnloaded = false;
  private playing = false;
  private pending: Pending | null = null;
  private phase: 'idle' | 'settling' | 'loading' | 'confirming' | 'playing' = 'idle';
  private timer: unknown = null;
  private lastStartAt = -Infinity;
  private readonly opts: Required<Omit<ClipSequencerOptions, 'log'>> & { log: (...p: unknown[]) => void };

  constructor(private readonly getPlayer: () => SequencedPlayer, options: ClipSequencerOptions = {}) {
    this.opts = {
      loadTimeoutMs: options.loadTimeoutMs ?? 1500,
      confirmMs: options.confirmMs ?? 700,
      settleMs: options.settleMs ?? 120,
      log: options.log ?? (() => {}),
      timers: options.timers ?? {
        setTimeout: (fn, ms) => setTimeout(fn, ms),
        clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
      },
      now: options.now ?? (() => Date.now()),
    };
  }

  /** Play `url` from `startSec`. Supersedes anything in flight. */
  start(url: string, startSec: number, rate: number): void {
    this.token += 1;
    this.clearTimer();
    this.getPlayer().pause();
    this.pending = { token: this.token, url, startSec, rate };
    const now = this.opts.now();
    const rapid = now - this.lastStartAt < this.opts.settleMs;
    this.lastStartAt = now;
    const needsLoad = !(this.loadedUrl === url && this.ready);
    if (rapid && needsLoad) {
      // Several presses in quick succession (next, back, next…): let them
      // settle, then load only the last — fewer replace() calls racing each
      // other on the native side. A seek within the loaded clip is safe and
      // runs straight away.
      this.phase = 'settling';
      const token = this.token;
      this.timer = this.opts.timers.setTimeout(() => {
        if (token === this.token) this.begin();
      }, this.opts.settleMs);
      return;
    }
    this.begin();
  }

  /** Stop playback and drop anything pending. */
  stop(): void {
    this.token += 1;
    this.clearTimer();
    this.pending = null;
    this.phase = 'idle';
    this.getPlayer().pause();
  }

  /** Forget the loaded source (new player, failure): the next start reloads. */
  forget(): void {
    this.stop();
    this.loadedUrl = null;
    this.ready = false;
  }

  /** Feed every playbackStatusUpdate from the player. */
  status(s: ClipStatus): void {
    if (typeof s.playing === 'boolean') this.playing = s.playing;
    if (this.phase === 'loading') {
      if (!s.isLoaded) {
        this.sawUnloaded = true;
      } else if (this.sawUnloaded) {
        this.ready = true;
        this.opts.log('loaded', this.loadedUrl);
        this.proceed();
      }
      // A loaded status before any unloaded one is the PREVIOUS source's.
      return;
    }
    if (this.phase === 'confirming' && s.playing) this.phase = 'playing';
  }

  get currentSource(): string | null {
    return this.loadedUrl;
  }

  private begin(): void {
    const job = this.pending;
    if (!job || job.token !== this.token) return;
    const player = this.getPlayer();
    if (this.loadedUrl === job.url && this.ready) {
      this.proceed();
      return;
    }
    this.loadedUrl = job.url;
    this.ready = false;
    this.sawUnloaded = false;
    this.playing = false;
    this.phase = 'loading';
    this.opts.log('load', job.url);
    player.replace({ uri: job.url });
    if (this.phase !== 'loading' || job.token !== this.token) return; // already proceeded on a sync status
    this.timer = this.opts.timers.setTimeout(() => {
      if (job.token !== this.token || this.phase !== 'loading') return;
      // No load confirmation (some sources report loaded straight away, or not
      // at all): go ahead — the confirm step below catches a dropped play.
      this.opts.log('load not confirmed; continuing', job.url);
      this.ready = true;
      this.proceed();
    }, this.opts.loadTimeoutMs);
  }

  private proceed(): void {
    const job = this.pending;
    if (!job || job.token !== this.token) return;
    this.clearTimer();
    const player = this.getPlayer();
    this.opts.log('seek', job.startSec.toFixed(2));
    try {
      const r = player.seekTo(job.startSec) as { catch?: (f: () => void) => void } | undefined;
      r?.catch?.(() => {});
    } catch {
      // Seek before load unsupported on some platforms; it plays from 0.
    }
    player.setPlaybackRate(job.rate);
    this.playing = false;
    this.phase = 'confirming';
    this.opts.log('play', job.url);
    player.play();
    this.confirm(job, 1);
  }

  private confirm(job: Pending, attempt: number): void {
    if (this.phase === 'playing' || this.playing) {
      this.phase = 'playing';
      return;
    }
    this.timer = this.opts.timers.setTimeout(() => {
      if (job.token !== this.token || this.phase !== 'confirming') return;
      if (this.playing) {
        this.phase = 'playing';
        return;
      }
      if (attempt >= 3) {
        this.opts.log('did not start after retries', job.url);
        this.phase = 'idle';
        return;
      }
      this.opts.log('not playing yet; pressing play again', job.url, `(#${attempt + 1})`);
      this.getPlayer().play();
      this.confirm(job, attempt + 1);
    }, this.opts.confirmMs);
  }

  private clearTimer(): void {
    if (this.timer !== null) this.opts.timers.clearTimeout(this.timer);
    this.timer = null;
  }
}
