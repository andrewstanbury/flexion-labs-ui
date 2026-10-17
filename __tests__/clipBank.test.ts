import { ClipBank, type BankPlayer, type BankStatus } from '../lib/clipBank';

// ClipBank against fake players that behave like iOS's: loading takes time,
// a play() before the player has loaded is dropped, "playing" arrives as a
// status event, and seekTo is asynchronous.

type Fake = BankPlayer & {
  uri: string;
  calls: string[];
  emit(s: BankStatus): void;
  load(): void;
  /** Report "playing" when play() is pressed (default true once loaded). */
  autoPlay: boolean;
};

function harness(opts: { loaded?: boolean; asyncSeek?: boolean } = {}) {
  const players: Fake[] = [];
  const log: string[] = [];
  const startedUrls: string[] = [];
  const failed: string[] = [];
  const createPlayer = jest.fn((uri: string): BankPlayer => {
    const listeners: ((s: BankStatus) => void)[] = [];
    const p: Fake = {
      uri,
      calls: [],
      autoPlay: true,
      isLoaded: opts.loaded ?? true,
      currentTime: 0,
      emit: (s) => [...listeners].forEach((l) => l(s)),
      load: () => {
        p.isLoaded = true;
        p.emit({ isLoaded: true });
      },
      play: jest.fn(() => {
        p.calls.push('play');
        log.push(`play:${uri}@${p.currentTime}`);
        if (p.isLoaded && p.autoPlay) p.emit({ isLoaded: true, playing: true });
      }),
      pause: jest.fn(() => {
        p.calls.push('pause');
      }),
      seekTo: jest.fn((sec: number) => {
        p.calls.push(`seek:${sec}`);
        if (opts.asyncSeek) {
          return Promise.resolve().then(() => {
            p.currentTime = sec;
          });
        }
        p.currentTime = sec;
        return undefined;
      }),
      setPlaybackRate: jest.fn(),
      remove: jest.fn(),
      addListener: jest.fn((_e: string, fn: (s: BankStatus) => void) => {
        listeners.push(fn);
        return { remove: () => listeners.splice(listeners.indexOf(fn), 1) };
      }),
    };
    players.push(p);
    return p;
  });
  const bank = new ClipBank({
    resolve: (url) => `file://${url}`,
    createPlayer,
    onStarted: (url) => startedUrls.push(url),
    onFailed: (url) => failed.push(url),
  });
  const playerOf = (url: string) => players.filter((p) => p.uri === `file://${url}`).pop()!;
  return { bank, players, playerOf, log, startedUrls, failed, createPlayer };
}

describe('ClipBank', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('buffers every recording up front, one player each, from its local file', () => {
    const h = harness();
    h.bank.prepare(['a', 'b', 'a']);
    expect(h.createPlayer.mock.calls.map((c) => c[0])).toEqual(['file://a', 'file://b']);
    h.bank.prepare(['a', 'b']); // idempotent
    expect(h.createPlayer).toHaveBeenCalledTimes(2);
    expect(h.bank.isReady('a')).toBe(true);
  });

  it('a fresh clip at its start plays without a seek, and reports when it has started', () => {
    const h = harness();
    h.bank.prepare(['a']);
    h.bank.play('a', 0, 1);
    expect(h.playerOf('a').calls).toEqual(['pause', 'play']);
    expect(h.startedUrls).toEqual(['a']);
  });

  it('waits for a clip that is still loading, then plays it', () => {
    const h = harness({ loaded: false });
    h.bank.prepare(['a']);
    h.bank.play('a', 0, 1);
    expect(h.playerOf('a').play).not.toHaveBeenCalled();
    h.playerOf('a').load();
    expect(h.playerOf('a').play).toHaveBeenCalledTimes(1);
    expect(h.startedUrls).toEqual(['a']);
  });

  it('notices a clip that loaded without telling anyone, by polling its loaded flag', () => {
    const h = harness({ loaded: false });
    h.bank.prepare(['a']);
    h.bank.play('a', 0, 1);
    jest.advanceTimersByTime(300);
    expect(h.playerOf('a').play).not.toHaveBeenCalled();
    h.playerOf('a').isLoaded = true; // no event
    jest.advanceTimersByTime(100);
    expect(h.playerOf('a').play).toHaveBeenCalledTimes(1);
    expect(h.startedUrls).toEqual(['a']);
  });

  it('plays only one clip at a time — starting one pauses all the others', () => {
    const h = harness();
    h.bank.prepare(['a', 'b']);
    h.bank.play('a', 0, 1);
    h.bank.play('b', 0, 1);
    expect(h.playerOf('a').calls.slice(-1)).toEqual(['pause']);
    expect(h.playerOf('b').calls.slice(-1)).toEqual(['play']);
  });

  it('a superseded clip that finishes loading later is never played', () => {
    const h = harness({ loaded: false });
    h.bank.prepare(['a', 'b']);
    h.playerOf('a').load();
    h.bank.play('b', 0, 1); // b still loading
    h.bank.play('a', 0, 1); // back to a
    h.playerOf('b').load();
    expect(h.playerOf('b').play).not.toHaveBeenCalled();
    expect(h.startedUrls).toEqual(['a']);
  });

  it('a clip that has played is sought back before it plays again', () => {
    const h = harness();
    h.bank.prepare(['a']);
    h.bank.play('a', 0, 1);
    h.playerOf('a').emit({ didJustFinish: true });
    h.bank.play('a', 0, 1);
    expect(h.playerOf('a').calls.slice(-2)).toEqual(['seek:0', 'play']);
  });

  it('with an asynchronous seek, play waits for the seek to land', async () => {
    const h = harness({ asyncSeek: true });
    h.bank.prepare(['a']);
    h.bank.play('a', 1.5, 1);
    expect(h.playerOf('a').play).not.toHaveBeenCalled();
    await Promise.resolve();
    await Promise.resolve();
    expect(h.log).toEqual(['play:file://a@1.5']);
  });

  it('a seek that lands after a newer start does not play the old clip', async () => {
    const h = harness({ asyncSeek: true });
    h.bank.prepare(['a', 'b']);
    h.bank.play('a', 1.5, 1);
    h.bank.play('b', 0, 1); // fresh, at 0: plays at once
    await Promise.resolve();
    await Promise.resolve();
    expect(h.playerOf('a').play).not.toHaveBeenCalled();
    expect(h.startedUrls).toEqual(['b']);
  });

  it('sets the rate on every start', () => {
    const h = harness();
    h.bank.prepare(['a']);
    h.bank.play('a', 0, 0.75);
    expect(h.playerOf('a').setPlaybackRate).toHaveBeenLastCalledWith(0.75);
  });

  it('presses play again when iOS drops the press, then gives up and reports failure', () => {
    const h = harness();
    h.bank.prepare(['a']);
    h.playerOf('a').autoPlay = false;
    h.bank.play('a', 0, 1);
    jest.advanceTimersByTime(600);
    expect(h.playerOf('a').play).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(600);
    expect(h.playerOf('a').play).toHaveBeenCalledTimes(3);
    jest.advanceTimersByTime(600);
    expect(h.failed).toEqual(['a']);
    expect(h.startedUrls).toEqual([]);
  });

  it('a second press that takes reports started and stops retrying', () => {
    const h = harness();
    h.bank.prepare(['a']);
    h.playerOf('a').autoPlay = false;
    h.bank.play('a', 0, 1);
    h.playerOf('a').autoPlay = true;
    jest.advanceTimersByTime(600);
    expect(h.startedUrls).toEqual(['a']);
    jest.advanceTimersByTime(5000);
    expect(h.playerOf('a').play).toHaveBeenCalledTimes(2);
  });

  it('reports a recording that errors, and a later play of it fails at once', () => {
    const h = harness();
    h.bank.prepare(['a']);
    h.playerOf('a').emit({ error: 'HTTP 403' });
    expect(h.failed).toEqual(['a']);
    h.bank.play('a', 0, 1);
    expect(h.failed).toEqual(['a', 'a']);
    expect(h.playerOf('a').play).not.toHaveBeenCalled();
  });

  it('reports a player that throws on creation or on play', () => {
    const h = harness();
    h.createPlayer.mockImplementationOnce(() => {
      throw new Error('bad source');
    });
    h.bank.prepare(['a', 'b']);
    expect(h.failed).toEqual(['a']);
    (h.playerOf('b').play as jest.Mock).mockImplementationOnce(() => {
      throw new Error('cannot play');
    });
    h.bank.play('b', 0, 1);
    expect(h.failed).toEqual(['a', 'b']);
  });

  it('stop pauses everything and cancels a pending play', () => {
    const h = harness({ loaded: false });
    h.bank.prepare(['a']);
    h.bank.play('a', 0, 1);
    h.bank.stop();
    h.playerOf('a').load();
    expect(h.playerOf('a').play).not.toHaveBeenCalled();
  });

  it('a recording requested before it was prepared is prepared then played', () => {
    const h = harness();
    h.bank.play('z', 0, 1);
    expect(h.startedUrls).toEqual(['z']);
  });

  it('resolves recordings asynchronously, streaming the URL if the download fails', async () => {
    const created: string[] = [];
    const bank = new ClipBank({
      resolve: (url) => (url === 'bad' ? Promise.reject(new Error('offline')) : Promise.resolve(`file://${url}`)),
      createPlayer: (uri) => {
        created.push(uri);
        return harness().createPlayer(uri);
      },
      onStarted: () => {},
      onFailed: () => {},
    });
    bank.prepare(['good', 'bad']);
    expect(created).toEqual([]);
    await Promise.resolve();
    await Promise.resolve();
    expect(created.sort()).toEqual(['bad', 'file://good']);
  });

  it('a resolver that throws streams the URL', () => {
    const created: string[] = [];
    const bank = new ClipBank({
      resolve: () => {
        throw new Error('no fs');
      },
      createPlayer: (uri) => {
        created.push(uri);
        return harness().createPlayer(uri);
      },
      onStarted: () => {},
      onFailed: () => {},
    });
    bank.prepare(['a']);
    expect(created).toEqual(['a']);
  });

  it('releases recordings dropped from the list, and everything on dispose', () => {
    const h = harness();
    h.bank.prepare(['a', 'b']);
    h.bank.prepare(['b']);
    expect(h.playerOf('a').remove).toHaveBeenCalled();
    h.bank.dispose();
    expect(h.playerOf('b').remove).toHaveBeenCalled();
    h.bank.prepare(['c']);
    h.bank.play('c', 0, 1);
    expect(h.createPlayer).toHaveBeenCalledTimes(2);
  });

  it('logs each step when given a logger', () => {
    const lines: string[] = [];
    const h = harness();
    const bank = new ClipBank({
      resolve: (u) => u,
      createPlayer: h.createPlayer,
      onStarted: () => {},
      onFailed: () => {},
      log: (...parts) => lines.push(String(parts[0])),
    });
    bank.prepare(['a']);
    bank.play('a', 0, 1);
    expect(lines).toEqual(['buffer', 'buffered', 'play', 'started']);
  });
});
