// The narrator's recordings, buffered before they are needed — the way a video
// player buffers before it plays.
//
// Every recording of a sequence is prepared up front: fetched to a local file
// (resolve), then given its OWN audio player, loaded and waiting. Playing a
// panel's narration is then pause-the-others → seek → play on a player that is
// already loaded. There is no source swapping (replace) while playing, which
// is what made the old single-player design race on a device: iOS answers a
// replace asynchronously, drops a play issued before the new source is ready,
// and briefly reports the OLD source as loaded.
//
// The bank reports when a clip has actually started (onStarted) so the panel
// clock can wait for the narration instead of running ahead of it, and reports
// a recording that cannot play (onFailed) so its panel falls back to speech.
//
// Native players and file access are injected: this file has no imports and is
// tested against fakes that behave like iOS (__tests__/clipBank.test.ts).

export type BankStatus = {
  isLoaded?: boolean;
  playing?: boolean;
  didJustFinish?: boolean;
  currentTime?: number;
  error?: unknown;
};

export type BankPlayer = {
  play(): void;
  pause(): void;
  seekTo(seconds: number): unknown;
  setPlaybackRate(rate: number): void;
  remove(): void;
  isLoaded?: boolean;
  currentTime?: number;
  addListener(event: 'playbackStatusUpdate', fn: (status: BankStatus) => void): { remove(): void };
};

type Timers = {
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (id: unknown) => void;
};

export type ClipBankDeps = {
  /** A playable URI for `url`: a local file once fetched, or `url` itself. */
  resolve(url: string): string | Promise<string>;
  createPlayer(uri: string): BankPlayer;
  /** Fired once per play() when that clip is audibly under way. */
  onStarted(url: string): void;
  /** The recording cannot be played (load error, never starts). */
  onFailed(url: string, reason: unknown): void;
  log?: (...parts: unknown[]) => void;
  timers?: Timers;
  /** Re-press play if "playing" has not been reported after this long (ms). */
  confirmMs?: number;
  /** Presses of play before giving up on a clip that will not start. */
  maxPlayAttempts?: number;
};

type Entry = {
  url: string;
  state: 'resolving' | 'loading' | 'ready' | 'failed';
  player: BankPlayer | null;
  sub: { remove(): void } | null;
  /** Position is unknown or at the end: always seek before playing. */
  dirty: boolean;
};

type Job = { token: number; url: string; startSec: number; rate: number; started: boolean; attempts: number };

export class ClipBank {
  private entries = new Map<string, Entry>();
  private job: Job | null = null;
  private token = 0;
  private timer: unknown = null;
  private disposed = false;
  private readonly timers: Timers;
  private readonly log: (...parts: unknown[]) => void;
  private readonly confirmMs: number;
  private readonly maxPlayAttempts: number;

  constructor(private readonly deps: ClipBankDeps) {
    this.timers = deps.timers ?? {
      setTimeout: (fn, ms) => setTimeout(fn, ms),
      clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
    };
    this.log = deps.log ?? (() => {});
    this.confirmMs = deps.confirmMs ?? 600;
    this.maxPlayAttempts = deps.maxPlayAttempts ?? 3;
  }

  /**
   * Buffers every recording in `urls` (idempotent). Recordings no longer in
   * the list are released.
   */
  prepare(urls: string[]): void {
    if (this.disposed) return;
    const wanted = new Set(urls);
    for (const [url, entry] of this.entries) {
      if (!wanted.has(url)) this.release(entry);
    }
    for (const url of wanted) {
      if (this.entries.has(url)) continue;
      const entry: Entry = { url, state: 'resolving', player: null, sub: null, dirty: false };
      this.entries.set(url, entry);
      this.log('buffer', url);
      let resolved: string | Promise<string>;
      try {
        resolved = this.deps.resolve(url);
      } catch {
        resolved = url; // no local copy: stream it
      }
      if (typeof resolved === 'string') {
        this.load(entry, resolved);
      } else {
        resolved.then(
          (uri) => this.load(entry, uri),
          () => this.load(entry, url),
        );
      }
    }
  }

  /** Plays `url` from `startSec`, stopping any other clip. */
  play(url: string, startSec: number, rate: number): void {
    if (this.disposed) return;
    this.token += 1;
    this.clearTimer();
    this.pauseAll();
    if (!this.entries.has(url)) this.prepare([...this.entries.keys(), url]);
    this.job = { token: this.token, url, startSec, rate, started: false, attempts: 0 };
    const entry = this.entries.get(url);
    if (entry?.state === 'failed') {
      this.deps.onFailed(url, 'unavailable');
      this.job = null;
      return;
    }
    if (entry?.state === 'ready') {
      this.go(this.job);
      return;
    }
    // Otherwise go() runs as soon as the clip is loaded — on its "loaded"
    // status event, or this poll of the player's own flag, whichever is first
    // (an event that fired before the listener existed is not missed).
    this.log('waiting for buffer', url);
    const job = this.job;
    const poll = () => {
      if (job.token !== this.token || job.attempts > 0) return;
      const e = this.entries.get(url);
      if (e?.state === 'loading' && e.player?.isLoaded) {
        this.ready(e);
        return;
      }
      if (e?.state === 'loading' || e?.state === 'resolving') this.timer = this.timers.setTimeout(poll, 100);
    };
    this.timer = this.timers.setTimeout(poll, 100);
  }

  /** Stops whatever is playing and drops a pending play. */
  stop(): void {
    this.token += 1;
    this.clearTimer();
    this.job = null;
    this.pauseAll();
  }

  isReady(url: string): boolean {
    return this.entries.get(url)?.state === 'ready';
  }

  /** Releases every player (unmount). */
  dispose(): void {
    this.stop();
    this.disposed = true;
    for (const entry of this.entries.values()) this.release(entry);
  }

  private load(entry: Entry, uri: string): void {
    if (this.disposed || this.entries.get(entry.url) !== entry) return;
    let player: BankPlayer;
    try {
      player = this.deps.createPlayer(uri);
    } catch (error) {
      this.fail(entry, error);
      return;
    }
    entry.player = player;
    entry.state = 'loading';
    entry.sub = player.addListener('playbackStatusUpdate', (s) => this.status(entry, s));
    // Some players are loaded before the listener could hear about it.
    if (player.isLoaded) this.ready(entry);
  }

  private status(entry: Entry, s: BankStatus): void {
    if (this.entries.get(entry.url) !== entry) return;
    if (s.error) {
      this.fail(entry, s.error);
      return;
    }
    if (s.isLoaded && entry.state === 'loading') this.ready(entry);
    if (s.didJustFinish) entry.dirty = true;
    const job = this.job;
    if (job && job.url === entry.url && !job.started && s.playing) {
      job.started = true;
      this.clearTimer();
      this.log('started', entry.url);
      this.deps.onStarted(entry.url);
    }
  }

  private ready(entry: Entry): void {
    entry.state = 'ready';
    this.log('buffered', entry.url);
    const job = this.job;
    if (job && job.url === entry.url && !job.started && job.attempts === 0) this.go(job);
  }

  private fail(entry: Entry, reason: unknown): void {
    if (entry.state === 'failed') return;
    this.log('clip failed', entry.url, reason);
    entry.state = 'failed';
    const job = this.job;
    if (job && job.url === entry.url) {
      this.clearTimer();
      this.job = null;
    }
    this.deps.onFailed(entry.url, reason);
  }

  private go(job: Job): void {
    const entry = this.entries.get(job.url);
    const player = entry?.player;
    if (!entry || !player || job.token !== this.token) return;
    player.setPlaybackRate(job.rate);
    const at = typeof player.currentTime === 'number' ? player.currentTime : null;
    const inPlace = !entry.dirty && at !== null && Math.abs(at - job.startSec) < 0.05;
    entry.dirty = true; // from here on the position moves
    if (inPlace) {
      this.press(job);
      return;
    }
    this.log('seek', job.url, job.startSec.toFixed(2));
    let pending: unknown;
    try {
      pending = player.seekTo(job.startSec);
    } catch {
      pending = undefined;
    }
    const then = (pending as { then?: (ok: () => void, bad: () => void) => void } | undefined)?.then;
    if (typeof then === 'function') {
      // Play once the seek has landed, so no audio from the old position leaks.
      then.call(
        pending,
        () => this.press(job),
        () => this.press(job),
      );
    } else {
      this.press(job);
    }
  }

  private press(job: Job): void {
    const player = this.entries.get(job.url)?.player;
    if (!player || job.token !== this.token || job.started) return;
    job.attempts += 1;
    this.log('play', job.url, job.attempts > 1 ? `(press #${job.attempts})` : '');
    try {
      player.play();
    } catch (error) {
      const entry = this.entries.get(job.url);
      if (entry) this.fail(entry, error);
      return;
    }
    if (job.started) return; // reported synchronously
    this.timer = this.timers.setTimeout(() => {
      if (job.token !== this.token || job.started) return;
      if (job.attempts >= this.maxPlayAttempts) {
        const entry = this.entries.get(job.url);
        if (entry) this.fail(entry, 'did not start');
        return;
      }
      this.press(job);
    }, this.confirmMs);
  }

  private pauseAll(): void {
    for (const entry of this.entries.values()) {
      try {
        entry.player?.pause();
      } catch {
        // A released or broken player: nothing to pause.
      }
    }
  }

  private release(entry: Entry): void {
    this.entries.delete(entry.url);
    entry.sub?.remove();
    try {
      entry.player?.remove();
    } catch {
      // Already gone.
    }
    entry.player = null;
    if (this.job?.url === entry.url) {
      this.clearTimer();
      this.job = null;
    }
  }

  private clearTimer(): void {
    if (this.timer !== null) this.timers.clearTimeout(this.timer);
    this.timer = null;
  }
}
