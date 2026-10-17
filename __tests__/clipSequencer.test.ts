import { ClipSequencer, type ClipStatus } from '../lib/clipSequencer';

// ClipSequencer orders the native player's commands for each clip start. These
// model the iOS behaviour that caused next/back glitches on a device:
// replace() returns before the new source is ready, a play() issued before it
// is ready is dropped, and the OLD source can still report loaded for a moment.

function fakePlayer() {
  const calls: string[] = [];
  const p = {
    calls,
    replace: jest.fn((s: { uri: string }): void => { calls.push(`replace:${s.uri}`); }),
    seekTo: jest.fn((sec: number) => {
      calls.push(`seek:${sec}`);
      return Promise.resolve();
    }),
    setPlaybackRate: jest.fn((r: number): void => { calls.push(`rate:${r}`); }),
    play: jest.fn((): void => { calls.push('play'); }),
    pause: jest.fn((): void => { calls.push('pause'); }),
  };
  return p;
}

function setup(opts: { settleMs?: number } = {}) {
  const player = fakePlayer();
  const seq = new ClipSequencer(() => player, { settleMs: opts.settleMs ?? 120 });
  const status = (s: ClipStatus) => seq.status(s);
  const loaded = () => {
    status({ isLoaded: false });
    status({ isLoaded: true, playing: false });
  };
  return { player, seq, status, loaded };
}

const after = (calls: string[], marker: string) => calls.slice(calls.lastIndexOf(marker) + 1);

describe('ClipSequencer', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('seeks and plays only after the new source reports loaded', () => {
    const { player, seq, loaded } = setup();
    seq.start('a.mp3', 0.5, 1);
    expect(player.calls).toEqual(['pause', 'replace:a.mp3']);
    loaded();
    expect(after(player.calls, 'replace:a.mp3')).toEqual(['seek:0.5', 'rate:1', 'play']);
  });

  it('ignores a loaded status from the previous source', () => {
    const { player, seq, status } = setup();
    seq.start('a.mp3', 0, 1);
    status({ isLoaded: true }); // the old source, still reporting
    expect(player.play).not.toHaveBeenCalled();
    status({ isLoaded: false });
    status({ isLoaded: true });
    expect(player.play).toHaveBeenCalledTimes(1);
  });

  it('a newer start drops everything still pending from the older one', () => {
    const { player, seq, loaded, status } = setup({ settleMs: 0 });
    seq.start('a.mp3', 0, 1);
    seq.start('b.mp3', 0, 1); // before a.mp3 loaded
    loaded();
    expect(player.replace.mock.calls.map((c) => c[0].uri)).toEqual(['a.mp3', 'b.mp3']);
    expect(player.play).toHaveBeenCalledTimes(1);
    expect(player.calls.slice(-3)).toEqual(['seek:0', 'rate:1', 'play']);
    expect(seq.currentSource).toBe('b.mp3');
    status({ isLoaded: true, playing: true });
    jest.advanceTimersByTime(5000); // a.mp3's load timeout must not fire a play
    expect(player.play).toHaveBeenCalledTimes(1);
  });

  it('coalesces rapid starts into one load of the last', () => {
    const { player, seq, loaded } = setup();
    seq.start('a.mp3', 0, 1);
    loaded();
    jest.advanceTimersByTime(30);
    seq.start('b.mp3', 0, 1); // next
    jest.advanceTimersByTime(30);
    seq.start('a.mp3', 0, 1); // back — same source, already loaded: straight away
    expect(player.replace).toHaveBeenCalledTimes(1);
    expect(player.play).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(30);
    seq.start('b.mp3', 0, 1); // next again: waits for the presses to stop
    seq.start('c.mp3', 0, 1);
    expect(player.replace).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(120);
    expect(player.replace.mock.calls.map((c) => c[0].uri)).toEqual(['a.mp3', 'c.mp3']);
    loaded();
    expect(player.play).toHaveBeenCalledTimes(3);
  });

  it('the same loaded source seeks and plays without reloading', () => {
    const { player, seq, loaded } = setup();
    seq.start('a.mp3', 0, 1);
    loaded();
    jest.advanceTimersByTime(500);
    seq.start('a.mp3', 2, 1.5);
    expect(player.replace).toHaveBeenCalledTimes(1);
    expect(player.calls.slice(-4)).toEqual(['pause', 'seek:2', 'rate:1.5', 'play']);
  });

  it('presses play again when the first play is dropped, up to three times', () => {
    const { player, seq, loaded, status } = setup();
    seq.start('a.mp3', 0, 1);
    loaded();
    expect(player.play).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(700);
    expect(player.play).toHaveBeenCalledTimes(2);
    status({ isLoaded: true, playing: true });
    jest.advanceTimersByTime(5000);
    expect(player.play).toHaveBeenCalledTimes(2);
  });

  it('gives up pressing play after three attempts', () => {
    const { player, seq, loaded } = setup();
    seq.start('a.mp3', 0, 1);
    loaded();
    jest.advanceTimersByTime(10000);
    expect(player.play).toHaveBeenCalledTimes(3);
  });

  it('does not press play again once playing was confirmed straight away', () => {
    const player = fakePlayer();
    const seq = new ClipSequencer(() => player);
    player.play.mockImplementation(() => {
      player.calls.push('play');
      seq.status({ isLoaded: true, playing: true });
    });
    player.replace.mockImplementation(() => {
      seq.status({ isLoaded: false });
      seq.status({ isLoaded: true });
    });
    seq.start('a.mp3', 0, 1);
    jest.advanceTimersByTime(5000);
    expect(player.play).toHaveBeenCalledTimes(1);
  });

  it('carries on after the load timeout when the player never confirms', () => {
    const { player, seq } = setup();
    seq.start('a.mp3', 1, 1);
    jest.advanceTimersByTime(1499);
    expect(player.play).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(player.calls.slice(-3)).toEqual(['seek:1', 'rate:1', 'play']);
  });

  it('stop cancels a pending load and its play', () => {
    const { player, seq, loaded } = setup();
    seq.start('a.mp3', 0, 1);
    seq.stop();
    loaded();
    jest.advanceTimersByTime(5000);
    expect(player.play).not.toHaveBeenCalled();
    expect(player.calls[player.calls.length - 1]).toBe('pause');
  });

  it('stop cancels a coalesced start before it loads', () => {
    const { player, seq, loaded } = setup();
    seq.start('a.mp3', 0, 1);
    loaded();
    seq.start('b.mp3', 0, 1);
    seq.stop();
    jest.advanceTimersByTime(5000);
    expect(player.replace).toHaveBeenCalledTimes(1);
  });

  it('forget makes the next start reload the same source', () => {
    const { player, seq, loaded } = setup();
    seq.start('a.mp3', 0, 1);
    loaded();
    seq.forget();
    expect(seq.currentSource).toBeNull();
    jest.advanceTimersByTime(500);
    seq.start('a.mp3', 0, 1);
    expect(player.replace).toHaveBeenCalledTimes(2);
  });

  it('survives a seek that throws or rejects', () => {
    const { player, seq, loaded } = setup();
    player.seekTo.mockImplementationOnce(() => {
      throw new Error('not ready');
    });
    seq.start('a.mp3', 1, 1);
    loaded();
    expect(player.play).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(500);
    player.seekTo.mockImplementationOnce(() => Promise.reject(new Error('seek failed')));
    seq.start('a.mp3', 2, 1);
    expect(player.play).toHaveBeenCalledTimes(2);
  });

  it('logs each step when given a logger', () => {
    const log = jest.fn();
    const player = fakePlayer();
    const seq = new ClipSequencer(() => player, { log });
    seq.start('a.mp3', 0, 1);
    seq.status({ isLoaded: false });
    seq.status({ isLoaded: true });
    expect(log.mock.calls.map((c) => c[0])).toEqual(['load', 'loaded', 'seek', 'play']);
  });
});
