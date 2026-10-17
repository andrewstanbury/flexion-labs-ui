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

// Every call that started a clip, as [url, seekSeconds] — a play is always
// preceded by a replace/create and a seek, in that order.
function clipStarts(): { url: string; at: number }[] {
  const p = player();
  const sources = [
    ...createPlayer.mock.calls.filter((c) => c[0]).map((c) => c[0].uri as string),
    ...p.replace.mock.calls.map((c: [{ uri: string }]) => c[0].uri),
  ];
  return p.seekTo.mock.calls.map((c: [number], i: number) => ({ url: sources[i] ?? sources[sources.length - 1], at: c[0] }));
}
const lastSeek = () => {
  const calls = player().seekTo.mock.calls;
  return calls.length ? calls[calls.length - 1][0] : undefined;
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
const xFor = (ms: number) => (ms / TOTAL_MS) * 300;
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
      expect(lastSeek()).toBe(0);
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
      expect(lastSeek()).toBe(0);
      expect(player().play).toHaveBeenCalled();
    });

    it('a new exercise forgets recordings that failed on the previous one', () => {
      const { rerender, getByTestId } = mount();
      const listener = player().addListener.mock.calls[0][1];
      act(() => listener({ error: 'HTTP 403' }));
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
      expect(lastSeek()).toBe(0);
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
      expect(lastSeek()).toBe(0);
      expect(player().play).toHaveBeenCalledTimes(1);
    });

    it('restart from a later panel goes back to the first panel and its recording', () => {
      const { getByTestId } = mount();
      act(() => jest.advanceTimersByTime(A_MS + 400));
      expect(lastSource()).toBe('https://cdn/b.mp3');
      reveal(getByTestId);
      fireEvent.press(getByTestId('c-restart'));
      expect(lastSource()).toBe('https://cdn/a.mp3');
      expect(lastSeek()).toBe(0);
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
      expect(lastSeek()).toBe(0);
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
      expect(lastSeek()).toBe(0);
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

  it('every clip start seeks first, so no clip ever plays from a stale position', () => {
    const { getByTestId } = mount();
    act(() => jest.advanceTimersByTime(A_MS + 200));
    reveal(getByTestId);
    fireEvent.press(getByTestId('c-restart'));
    const p = player();
    expect(p.seekTo.mock.calls.length).toBe(p.play.mock.calls.length);
    expect(clipStarts().length).toBe(p.play.mock.calls.length);
  });
});
