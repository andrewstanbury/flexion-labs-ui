import { act, fireEvent, render } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import * as Speech from 'expo-speech';
import { createAudioPlayer } from 'expo-audio';
import { PanelCarousel, type PanelStep } from '../PanelCarousel';

// The panel player should behave like a video player whose soundtrack is the
// narrator: load at the start, pause/resume in place, restart from the top,
// and scrub — with the recorded narration following every one of those moves.
// These pin that contract, which earlier versions broke (restart left the
// narrator silent; resume and scrub never picked the narration back up).

const speak = Speech.speak as jest.Mock;
const stop = Speech.stop as jest.Mock;
const createPlayer = createAudioPlayer as jest.Mock;
// jest.setup.ts hands back one shared mock player.
const player = () => createPlayer();

// Panel A: 4.0s recording + 200ms buffer + 0.5s hold = 4700ms.
// Panel B: 3.0s recording + 200ms buffer + 0.5s hold = 3700ms. Total 8400ms.
const A_MS = 4700;
const TOTAL_MS = 8400;
const STEPS: PanelStep[] = [
  { text: 'Stand tall holding a chair.', holdSeconds: 0.5, audioUrl: 'https://cdn/a.mp3', audioDurationMs: 4000 },
  { text: 'Rise onto your toes.', holdSeconds: 0.5, audioUrl: 'https://cdn/b.mp3', audioDurationMs: 3000 },
];
const URIS = ['a.png', 'b.png'];

function mount(props: Partial<React.ComponentProps<typeof PanelCarousel>> = {}) {
  const utils = render(
    <PanelCarousel uris={URIS} narrate steps={STEPS} intervalMs={500} testID="c" {...props} />,
  );
  fireEvent(utils.getByTestId('c'), 'layout', { nativeEvent: { layout: { width: 300, height: 300 } } });
  return utils;
}

const lastSeek = () => {
  const calls = player().seekTo.mock.calls;
  return calls.length ? calls[calls.length - 1][0] : undefined;
};
// Where the most recent clip start began, in seconds: the last seek if it came
// after the last source change, else 0 (a freshly loaded clip starts at 0).
const startedAt = () => {
  const p = player();
  const lastOrder = (m: jest.Mock) => {
    const o = m.mock.invocationCallOrder;
    return o.length ? o[o.length - 1] : -1;
  };
  return lastOrder(p.seekTo) > lastOrder(p.replace) ? lastSeek() : 0;
};
const lastSource = () => {
  const replaced = player().replace.mock.calls;
  if (replaced.length) return replaced[replaced.length - 1][0].uri;
  const created = createPlayer.mock.calls.filter((c) => c[0]);
  return created.length ? created[created.length - 1][0].uri : undefined;
};

// PanResponder computes drag state from RN's native touch history, which a
// synthetic event does not carry — so these build one. One active touch whose
// page X moves; timestamps strictly increase as the real recorder's do.
let clock = 1000;
function touch(pageX: number, previousPageX: number, startPageX: number) {
  clock += 16;
  const t = {
    touchActive: true,
    startPageX, startPageY: 0, startTimeStamp: clock - 16,
    currentPageX: pageX, currentPageY: 0, currentTimeStamp: clock,
    previousPageX, previousPageY: 0, previousTimeStamp: clock - 16,
  };
  return {
    nativeEvent: { locationX: pageX, pageX, touches: [{}], changedTouches: [{}] },
    touchHistory: { touchBank: [t], numberActiveTouches: 1, indexOfSingleActiveTouch: 0, mostRecentTimeStamp: clock },
  };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function scrub(getByTestId: any, fromX: number, toX = fromX, release = true) {
  const bar = getByTestId('c-timeline');
  fireEvent(bar, 'layout', { nativeEvent: { layout: { width: 300 } } });
  act(() => {
    bar.props.onResponderGrant(touch(fromX, fromX, fromX));
  });
  if (toX !== fromX) {
    act(() => {
      bar.props.onResponderMove(touch(toX, fromX, fromX));
    });
  }
  if (release) {
    act(() => {
      bar.props.onResponderRelease(touch(toX, toX, fromX));
    });
  }
}
// The timeline's touch area is 300 wide with 12 of padding each side.
const xFor = (ms: number) => 12 + (ms / TOTAL_MS) * (300 - 24);
// Real time: one render per clock tick, as on a device. A single big
// advanceTimersByTime batches every tick into one render, which skips the
// intermediate panels' narration in a way that never happens on a phone.
const playFor = (ms: number) => {
  for (let t = 0; t < ms; t += 100) act(() => jest.advanceTimersByTime(100));
};
// Presses that change the clip within ClipSequencer's settle window (120ms)
// of the previous start are coalesced: the load waits for the presses to stop.
// Tests act faster than any finger, so they let it settle like a device would.
const settle = () => act(() => jest.advanceTimersByTime(150));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isPlaying = (getByTestId: any) => getByTestId('c-toggle').props.accessibilityLabel === 'Pause';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const reveal = (getByTestId: any) => fireEvent.press(getByTestId('c-tap-area'));

describe('PanelCarousel playback — behaves like a video with a narrator track', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    clock = 1000;
    // Never settles: a resolved value would update state after the synchronous
    // test body, outside act(). Screen reader stays at its initial "off".
    jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockReturnValue(new Promise(() => {}));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({ remove: jest.fn() } as any);
  });
  afterEach(() => jest.useRealTimers());

  describe('load', () => {
    it('starts on the first panel with its recording from the beginning', () => {
      mount();
      expect(lastSource()).toBe('https://cdn/a.mp3');
      expect(startedAt()).toBe(0);
      expect(player().play).toHaveBeenCalledTimes(1);
      expect(speak).not.toHaveBeenCalled();
    });

    it('a new exercise resets: stops the old narrator and starts the new first panel at 0', () => {
      const { rerender, getByTestId } = mount();
      act(() => jest.advanceTimersByTime(2000));
      player().play.mockClear();
      player().seekTo.mockClear();
      stop.mockClear();
      rerender(
        <PanelCarousel
          uris={['x.png', 'y.png']}
          narrate
          intervalMs={500}
          testID="c"
          steps={[{ ...STEPS[0], audioUrl: 'https://cdn/x.mp3' }, STEPS[1]]}
        />,
      );
      fireEvent(getByTestId('c'), 'layout', { nativeEvent: { layout: { width: 300, height: 300 } } });
      expect(stop).toHaveBeenCalled();
      expect(lastSource()).toBe('https://cdn/x.mp3');
      expect(startedAt()).toBe(0);
      expect(player().play).toHaveBeenCalled();
    });

    it('a new exercise forgets recordings that failed on the previous one', () => {
      const { rerender, getByTestId } = mount();
      const listener = player().addListener.mock.calls[0][1];
      // The retry's reload fails the same way.
      player().replace.mockImplementationOnce(() => listener({ error: 'HTTP 403' }));
      act(() => listener({ error: 'HTTP 403' }));
      settle(); // the retry reloads, and fails past the retry budget
      expect(speak).toHaveBeenCalled(); // fell back to TTS for a.mp3
      speak.mockClear();
      player().play.mockClear();
      rerender(<PanelCarousel uris={['x.png', 'y.png']} narrate intervalMs={500} testID="c" steps={STEPS} />);
      fireEvent(getByTestId('c'), 'layout', { nativeEvent: { layout: { width: 300, height: 300 } } });
      // Same URL, fresh exercise: the recording gets another chance.
      expect(lastSource()).toBe('https://cdn/a.mp3');
      expect(player().play).toHaveBeenCalled();
      expect(speak).not.toHaveBeenCalled();
    });

    it('a recording that arrives after playback started takes over from on-device speech', () => {
      const textOnly = STEPS.map(({ text, holdSeconds }) => ({ text, holdSeconds }));
      const { rerender } = render(
        <PanelCarousel uris={URIS} narrate steps={textOnly} intervalMs={500} testID="c" />,
      );
      expect(speak).toHaveBeenCalledWith(STEPS[0].text, expect.any(Object));
      stop.mockClear();
      act(() => jest.advanceTimersByTime(300));
      rerender(<PanelCarousel uris={URIS} narrate steps={STEPS} intervalMs={500} testID="c" />);
      expect(stop).toHaveBeenCalled();
      expect(lastSource()).toBe('https://cdn/a.mp3');
      expect(lastSeek()).toBeCloseTo(0.3, 1);
    });
  });

  describe('restart', () => {
    it('replay after the end plays the first recording again, from 0', () => {
      const { getByTestId } = mount();
      act(() => jest.advanceTimersByTime(TOTAL_MS + 500));
      expect(isPlaying(getByTestId)).toBe(false);
      player().play.mockClear();
      player().seekTo.mockClear();
      fireEvent.press(getByTestId('c-toggle')); // the replay button
      expect(lastSource()).toBe('https://cdn/a.mp3');
      expect(startedAt()).toBe(0);
      expect(player().play).toHaveBeenCalledTimes(1);
    });

    it('restart while still on the first panel rewinds the same clip rather than staying silent', () => {
      const { getByTestId } = mount();
      act(() => jest.advanceTimersByTime(2000));
      player().play.mockClear();
      player().seekTo.mockClear();
      reveal(getByTestId);
      fireEvent.press(getByTestId('c-restart'));
      expect(lastSource()).toBe('https://cdn/a.mp3');
      expect(startedAt()).toBe(0);
      expect(player().play).toHaveBeenCalledTimes(1);
    });

    it('restart from a later panel goes back to the first panel and its recording', () => {
      const { getByTestId } = mount();
      act(() => jest.advanceTimersByTime(A_MS + 400));
      expect(lastSource()).toBe('https://cdn/b.mp3');
      reveal(getByTestId);
      fireEvent.press(getByTestId('c-restart'));
      settle();
      expect(lastSource()).toBe('https://cdn/a.mp3');
      expect(startedAt()).toBe(0);
    });
  });

  describe('pause and resume', () => {
    it('resuming continues the recording from where it was paused', () => {
      const { getByTestId } = mount();
      act(() => jest.advanceTimersByTime(1500));
      reveal(getByTestId);
      fireEvent.press(getByTestId('c-toggle')); // pause
      expect(player().pause).toHaveBeenCalled();
      player().play.mockClear();
      fireEvent.press(getByTestId('c-toggle')); // resume
      expect(lastSource()).toBe('https://cdn/a.mp3');
      expect(lastSeek()).toBeCloseTo(1.5, 1);
      expect(player().play).toHaveBeenCalledTimes(1);
    });

    it('resuming after the recording has finished stays quiet until the next panel', () => {
      const { getByTestId } = mount();
      act(() => jest.advanceTimersByTime(4300)); // clip is 4.0s; still in panel A's hold
      reveal(getByTestId);
      fireEvent.press(getByTestId('c-toggle'));
      player().play.mockClear();
      fireEvent.press(getByTestId('c-toggle'));
      expect(player().play).not.toHaveBeenCalled();
      act(() => jest.advanceTimersByTime(600)); // into panel B
      expect(lastSource()).toBe('https://cdn/b.mp3');
      expect(startedAt()).toBe(0);
      expect(player().play).toHaveBeenCalledTimes(1);
    });

    it('on-device speech re-reads the line when resumed early in it, and waits when resumed late', () => {
      const textOnly = [{ text: 'One two three four five six seven eight nine ten.', holdSeconds: 0.5 }, { text: 'Next.' }];
      const { getByTestId } = render(
        <PanelCarousel uris={URIS} narrate steps={textOnly} intervalMs={500} testID="c" />,
      );
      fireEvent(getByTestId('c'), 'layout', { nativeEvent: { layout: { width: 300, height: 300 } } });
      act(() => jest.advanceTimersByTime(500));
      reveal(getByTestId);
      fireEvent.press(getByTestId('c-toggle'));
      speak.mockClear();
      fireEvent.press(getByTestId('c-toggle'));
      act(() => jest.advanceTimersByTime(200)); // the speech restart gap
      expect(speak).toHaveBeenCalledWith(textOnly[0].text, expect.any(Object));

      act(() => jest.advanceTimersByTime(3500)); // well past the line's midpoint
      fireEvent.press(getByTestId('c-toggle'));
      speak.mockClear();
      fireEvent.press(getByTestId('c-toggle'));
      expect(speak).not.toHaveBeenCalled();
    });
  });

  describe('scrubbing', () => {
    it('pauses while dragging, then resumes with the narrator at the landing point', () => {
      const { getByTestId } = mount();
      act(() => jest.advanceTimersByTime(500));
      scrub(getByTestId, xFor(500), xFor(2000), false);
      expect(isPlaying(getByTestId)).toBe(false);
      expect(player().pause).toHaveBeenCalled();
      player().play.mockClear();
      act(() => {
        getByTestId('c-timeline').props.onResponderRelease(touch(xFor(2000), xFor(2000), xFor(500)));
      });
      expect(isPlaying(getByTestId)).toBe(true);
      expect(lastSource()).toBe('https://cdn/a.mp3');
      expect(lastSeek()).toBeGreaterThan(1.8);
      expect(lastSeek()).toBeLessThan(2.2);
      expect(player().play).toHaveBeenCalledTimes(1);
    });

    it('scrubbing into the next panel plays that panel’s recording from the matching point', () => {
      const { getByTestId } = mount();
      scrub(getByTestId, xFor(A_MS + 900));
      settle();
      expect(lastSource()).toBe('https://cdn/b.mp3');
      expect(lastSeek()).toBeGreaterThan(0.7);
      expect(lastSeek()).toBeLessThan(1.1);
    });

    it('scrubbing while paused stays paused and silent', () => {
      const { getByTestId } = mount({ autoPlay: false });
      player().play.mockClear();
      scrub(getByTestId, xFor(1000));
      expect(isPlaying(getByTestId)).toBe(false);
      expect(player().play).not.toHaveBeenCalled();
      expect(speak).not.toHaveBeenCalled();
    });

    it('scrubbing past the end of a panel’s recording plays nothing until the next panel', () => {
      const { getByTestId } = mount();
      player().play.mockClear();
      scrub(getByTestId, xFor(4400)); // panel A, after its 4.0s clip
      expect(player().play).not.toHaveBeenCalled();
      act(() => jest.advanceTimersByTime(500));
      expect(lastSource()).toBe('https://cdn/b.mp3');
      expect(player().play).toHaveBeenCalledTimes(1);
    });

    it('scrubbing back within the same panel replays from the new point, not silence', () => {
      const { getByTestId } = mount();
      act(() => jest.advanceTimersByTime(3000));
      player().play.mockClear();
      scrub(getByTestId, xFor(1000));
      expect(lastSource()).toBe('https://cdn/a.mp3');
      expect(lastSeek()).toBeCloseTo(1, 0);
      expect(player().play).toHaveBeenCalledTimes(1);
    });
  });

  describe('skip and speed', () => {
    it('next keeps playing and starts the next panel’s recording at 0', () => {
      const { getByTestId } = mount();
      act(() => jest.advanceTimersByTime(1000));
      reveal(getByTestId);
      fireEvent.press(getByTestId('c-next'));
      expect(isPlaying(getByTestId)).toBe(true);
      expect(lastSource()).toBe('https://cdn/b.mp3');
      expect(startedAt()).toBe(0);
    });

    it('keeps the playback rate after a resume', () => {
      const { getByTestId } = mount();
      reveal(getByTestId);
      fireEvent.press(getByTestId('c-speed')); // 0.75x
      fireEvent.press(getByTestId('c-toggle'));
      player().setPlaybackRate.mockClear();
      fireEvent.press(getByTestId('c-toggle'));
      expect(player().setPlaybackRate).toHaveBeenLastCalledWith(0.75);
    });
  });

  describe('first clip — same path and audio session as every other clip', () => {
    it('prepares the audio session before the viewer presses play', () => {
      const setMode = require('expo-audio').setAudioModeAsync as jest.Mock;
      mount({ autoPlay: false });
      expect(setMode).toHaveBeenCalledWith({ playsInSilentMode: true });
      expect(player().play).not.toHaveBeenCalled();
    });

    it('loads the first clip into an empty player via replace, like every later clip', () => {
      mount();
      expect(createPlayer).toHaveBeenCalledWith(null);
      expect(player().replace).toHaveBeenCalledWith({ uri: 'https://cdn/a.mp3' });
      expect(player().play).toHaveBeenCalledTimes(1);
    });

    it('seeks and plays a fresh clip only once the player reports it loaded', () => {
      const { getByTestId } = mount();
      const p = player();
      act(() => jest.advanceTimersByTime(500));
      // Make the next load slow, as on a device: replace() returns before the
      // new source is ready, and the player still reports the OLD one loaded.
      p.replace.mockImplementationOnce(() => p.__emit({ isLoaded: true, playing: false }));
      p.seekTo.mockClear();
      p.play.mockClear();
      scrub(getByTestId, xFor(A_MS + 900)); // into panel B: a fresh clip
      settle();
      expect(lastSource()).toBe('https://cdn/b.mp3');
      expect(p.seekTo).not.toHaveBeenCalled();
      expect(p.play).not.toHaveBeenCalled();
      act(() => p.__emit({ isLoaded: false }));
      act(() => p.__emit({ isLoaded: true }));
      expect(p.seekTo).toHaveBeenCalledTimes(1);
      expect(p.seekTo.mock.calls[0][0]).toBeGreaterThan(0.7);
      expect(p.play).toHaveBeenCalledTimes(1);
      // Later status updates must not keep yanking the playhead.
      act(() => p.__emit({ isLoaded: true, playing: true }));
      expect(p.seekTo).toHaveBeenCalledTimes(1);
    });

    it('a clip already loaded is rewound before it plays again', () => {
      const { getByTestId } = mount();
      act(() => jest.advanceTimersByTime(2000));
      reveal(getByTestId);
      player().seekTo.mockClear();
      fireEvent.press(getByTestId('c-restart'));
      const p = player();
      expect(p.seekTo).toHaveBeenCalledWith(0);
      expect(p.seekTo.mock.invocationCallOrder[0]).toBeLessThan(
        p.play.mock.invocationCallOrder[p.play.mock.invocationCallOrder.length - 1],
      );
    });
  });

  describe('reported glitches', () => {
    it('previous while playing lands on the previous panel and stays there — the clock does not snap back', () => {
      const { getByTestId } = mount();
      act(() => jest.advanceTimersByTime(A_MS + 1000)); // into panel B
      expect(lastSource()).toBe('https://cdn/b.mp3');
      reveal(getByTestId);
      fireEvent.press(getByTestId('c-prev'));
      settle();
      expect(lastSource()).toBe('https://cdn/a.mp3');
      expect(startedAt()).toBe(0);
      player().replace.mockClear();
      act(() => jest.advanceTimersByTime(1000)); // the clock keeps running from panel A
      expect(player().replace).not.toHaveBeenCalled(); // no jump back to B
      expect(isPlaying(getByTestId)).toBe(true);
    });

    it('pressing previous repeatedly from the first panel replays its narration, never silence', () => {
      const { getByTestId } = mount();
      act(() => jest.advanceTimersByTime(1500));
      reveal(getByTestId);
      for (let i = 0; i < 3; i++) {
        player().play.mockClear();
        fireEvent.press(getByTestId('c-prev'));
        expect(player().play).toHaveBeenCalledTimes(1);
        expect(lastSeek()).toBe(0);
      }
    });

    it('a drag across several moves follows the finger, measured from where it went down', () => {
      const { getByTestId } = mount();
      const bar = getByTestId('c-timeline');
      fireEvent(bar, 'layout', { nativeEvent: { layout: { width: 300 } } });
      const x0 = xFor(1000);
      act(() => bar.props.onResponderGrant(touch(x0, x0, x0)));
      let prev = x0;
      for (const ms of [2000, 6000, 3000]) {
        const x = xFor(ms);
        // RN accumulates dx from each move's previous position, as a real touch reports it.
        act(() => getByTestId('c-timeline').props.onResponderMove(touch(x, prev, x0)));
        prev = x;
      }
      act(() => getByTestId('c-timeline').props.onResponderRelease(touch(xFor(3000), xFor(3000), x0)));
      expect(lastSource()).toBe('https://cdn/a.mp3');
      expect(lastSeek()).toBeGreaterThan(2.8);
      expect(lastSeek()).toBeLessThan(3.2);
    });

    it('a drag whose release never arrives does not leave the player stuck silent', () => {
      const { getByTestId } = mount();
      scrub(getByTestId, xFor(1000), xFor(1000), false); // finger down, no release
      expect(isPlaying(getByTestId)).toBe(false);
      player().play.mockClear();
      reveal(getByTestId);
      fireEvent.press(getByTestId('c-toggle'));
      expect(isPlaying(getByTestId)).toBe(true);
      expect(player().play).toHaveBeenCalledTimes(1);
    });

    it('next then back in quick succession ends on the first panel, playing its recording', () => {
      const { getByTestId } = mount();
      act(() => jest.advanceTimersByTime(1000));
      reveal(getByTestId);
      fireEvent.press(getByTestId('c-next'));
      fireEvent.press(getByTestId('c-prev'));
      settle();
      expect(isPlaying(getByTestId)).toBe(true);
      expect(lastSource()).toBe('https://cdn/a.mp3');
      expect(startedAt()).toBe(0);
      const p = player();
      const lastPlay = p.play.mock.invocationCallOrder[p.play.mock.invocationCallOrder.length - 1];
      expect(lastPlay).toBeGreaterThan(p.replace.mock.invocationCallOrder[p.replace.mock.invocationCallOrder.length - 1]);
    });

    it('next and back before a slow load finishes never plays the abandoned clip', () => {
      const { getByTestId } = mount();
      act(() => jest.advanceTimersByTime(1000));
      const p = player();
      // Loads now report nothing until the test says so, as on a slow device.
      const emitting = p.replace.getMockImplementation();
      p.replace.mockImplementation(() => {});
      reveal(getByTestId);
      fireEvent.press(getByTestId('c-next')); // starts loading b.mp3
      p.play.mockClear();
      fireEvent.press(getByTestId('c-prev')); // back before b.mp3 loaded
      settle();
      act(() => p.__emit({ isLoaded: false }));
      act(() => p.__emit({ isLoaded: true })); // b's late load confirmation...
      // ...is taken for a.mp3's, the source the player was last given.
      expect(lastSource()).toBe('https://cdn/a.mp3');
      expect(p.play).toHaveBeenCalledTimes(1);
      act(() => p.__emit({ isLoaded: true, playing: true }));
      playFor(2000);
      expect(lastSource()).toBe('https://cdn/a.mp3');
      expect(p.play).toHaveBeenCalledTimes(1);
      expect(isPlaying(getByTestId)).toBe(true);
      p.replace.mockImplementation(emitting);
    });

    it('a burst of next/back presses loads only where it lands', () => {
      const { getByTestId } = mount();
      act(() => jest.advanceTimersByTime(1000));
      reveal(getByTestId);
      player().replace.mockClear();
      for (let i = 0; i < 3; i++) {
        fireEvent.press(getByTestId('c-next'));
        act(() => jest.advanceTimersByTime(40));
        fireEvent.press(getByTestId('c-prev'));
        act(() => jest.advanceTimersByTime(40));
      }
      fireEvent.press(getByTestId('c-next'));
      settle();
      const sources = player().replace.mock.calls.map((c: [{ uri: string }]) => c[0].uri);
      expect(sources[sources.length - 1]).toBe('https://cdn/b.mp3');
      expect(sources.length).toBeLessThanOrEqual(2); // the first next, then where it landed
      expect(isPlaying(getByTestId)).toBe(true);
    });

    it('controls stay up while the viewer keeps pressing them — the auto-hide restarts on each press', () => {
      const { getByTestId } = mount();
      reveal(getByTestId);
      const visible = () => getByTestId('c-controls').props.pointerEvents !== 'none';
      for (let i = 0; i < 4; i++) {
        act(() => jest.advanceTimersByTime(2000)); // under the 2.5s auto-hide
        expect(visible()).toBe(true);
        fireEvent.press(getByTestId(i % 2 ? 'c-prev' : 'c-next'));
      }
      act(() => jest.advanceTimersByTime(3000));
      expect(visible()).toBe(false);
    });

    it('a mixed exercise (recording, speech, recording) narrates every panel through a full play and a restart', () => {
      const mixed: PanelStep[] = [
        STEPS[0],
        { text: 'Hold at the top.', holdSeconds: 0.5 },
        { text: 'Lower slowly.', holdSeconds: 0.5, audioUrl: 'https://cdn/c.mp3', audioDurationMs: 2000 },
      ];
      const { getByTestId } = mount({ uris: ['a.png', 'b.png', 'c.png'], steps: mixed });
      playFor(12000);
      expect(speak).toHaveBeenCalledWith('Hold at the top.', expect.any(Object));
      const sources = player().replace.mock.calls.map((c: [{ uri: string }]) => c[0].uri);
      expect(sources).toEqual(['https://cdn/a.mp3', 'https://cdn/c.mp3']);
      speak.mockClear();
      player().play.mockClear();
      fireEvent.press(getByTestId('c-toggle')); // replay from the end
      expect(lastSource()).toBe('https://cdn/a.mp3');
      expect(startedAt()).toBe(0);
      playFor(12000);
      expect(speak).toHaveBeenCalledWith('Hold at the top.', expect.any(Object));
      expect(player().play).toHaveBeenCalledTimes(2);
    });
  });

  describe('device behaviour', () => {
    it('one error from a recording is retried — it reloads and keeps playing the recording', () => {
      mount();
      const listener = player().addListener.mock.calls[0][1];
      player().replace.mockClear();
      player().play.mockClear();
      act(() => listener({ error: 'cancelled' }));
      settle();
      expect(player().replace).toHaveBeenCalledWith({ uri: 'https://cdn/a.mp3' });
      expect(player().play).toHaveBeenCalledTimes(1);
      expect(speak).not.toHaveBeenCalled();
    });

    it('an error while nothing should be playing (an abandoned load) does not count against the recording', () => {
      const { getByTestId } = mount();
      const listener = player().addListener.mock.calls[0][1];
      reveal(getByTestId);
      fireEvent.press(getByTestId('c-toggle')); // pause
      act(() => listener({ error: 'cancelled' }));
      act(() => listener({ error: 'cancelled' }));
      act(() => listener({ error: 'cancelled' }));
      player().play.mockClear();
      fireEvent.press(getByTestId('c-toggle')); // resume
      settle();
      expect(lastSource()).toBe('https://cdn/a.mp3');
      expect(player().play).toHaveBeenCalledTimes(1);
      expect(speak).not.toHaveBeenCalled();
    });

    it('a successful load resets the retry budget, so later errors are retried again', () => {
      mount();
      const listener = player().addListener.mock.calls[0][1];
      act(() => listener({ error: 'cancelled' }));
      act(() => listener({ isLoaded: true }));
      act(() => listener({ error: 'cancelled' }));
      expect(speak).not.toHaveBeenCalled();
    });

    it('speech right after stopping speech waits out the stop, and a newer take cancels it', () => {
      const textOnly = [{ text: 'One.', holdSeconds: 0.5 }, { text: 'Two.', holdSeconds: 0.5 }, { text: 'Three.' }];
      const { getByTestId } = render(
        <PanelCarousel uris={['a.png', 'b.png', 'c.png']} narrate steps={textOnly} intervalMs={500} testID="c" />,
      );
      fireEvent(getByTestId('c'), 'layout', { nativeEvent: { layout: { width: 300, height: 300 } } });
      expect(speak).toHaveBeenLastCalledWith('One.', expect.any(Object));
      reveal(getByTestId);
      speak.mockClear();
      fireEvent.press(getByTestId('c-next')); // -> Two (gap pending)
      fireEvent.press(getByTestId('c-next')); // -> Three before the gap ends
      expect(speak).not.toHaveBeenCalled();
      act(() => jest.advanceTimersByTime(200));
      expect(speak).toHaveBeenCalledTimes(1);
      expect(speak).toHaveBeenLastCalledWith('Three.', expect.any(Object));
    });
  });
});
