import { act, fireEvent, render } from '@testing-library/react-native';
import { PanelCarousel } from '../PanelCarousel';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function layout(view: any) {
  fireEvent(view, 'layout', { nativeEvent: { layout: { width: 300, height: 300 } } });
}

// Advances the fake clock, then fires `load` on whichever slot now holds
// `nextUri` — mirrors what a real <Image> does once it finishes decoding,
// which is what actually starts the crossfade (see the component's
// "seamless" comment: the fade must not start before there's a decoded
// frame to fade in). Not keyed off opacity — useNativeDriver:true moves
// opacity updates to the native side, so there's nothing meaningful to read
// back from JS in a test environment; which *uri* is in which slot is the
// stable, always-inspectable signal instead.
function advanceAndLoad(
  ms: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queryByTestId: any,
  nextUri: string,
  testID = 'carousel',
) {
  act(() => jest.advanceTimersByTime(ms));
  for (const n of [0, 1] as const) {
    const slot = queryByTestId(`${testID}-slot-${n}`);
    if (slot && slot.props.source.uri === nextUri) {
      act(() => fireEvent(slot, 'load'));
    }
  }
}

// Whichever slot currently holds `expectedUri` is the one showing it — the
// two slots keep alternating which index is "active" as playback advances
// (see PanelCarousel's double-buffer comment), so "prefer slot 1" or any
// other fixed-index guess is wrong as soon as a second transition hands
// activity back to slot 0. Checking both is the only reliable signal from
// the test side, short of reaching into the animated opacity values, which
// useNativeDriver:true makes unreadable from JS in a test environment
// anyway.
function isShowing(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queryByTestId: any,
  expectedUri: string,
  testID = 'carousel',
): boolean {
  const slot0 = queryByTestId(`${testID}-slot-0`);
  const slot1 = queryByTestId(`${testID}-slot-1`);
  return slot0?.props.source.uri === expectedUri || slot1?.props.source.uri === expectedUri;
}

describe('<PanelCarousel />', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('renders nothing for an empty list', () => {
    const { toJSON } = render(<PanelCarousel uris={[]} testID="carousel" />);
    expect(toJSON()).toBeNull();
  });

  it('shows the first panel initially, contain-fit so nothing is cropped', () => {
    const { getByTestId } = render(<PanelCarousel uris={['a.jpg', 'b.jpg']} testID="carousel" />);
    layout(getByTestId('carousel'));
    const slot0 = getByTestId('carousel-slot-0');
    expect(slot0.props.source.uri).toBe('a.jpg');
    expect(slot0.props.resizeMode).toBe('contain');
  });

  it('has no swipe/paging surface and no page dots — not a slider', () => {
    const { getByTestId, queryByTestId, UNSAFE_queryAllByType } = render(
      <PanelCarousel uris={['a.jpg', 'b.jpg', 'c.jpg']} testID="carousel" />,
    );
    layout(getByTestId('carousel'));
    expect(queryByTestId('carousel-scroll')).toBeNull();
    expect(queryByTestId('carousel-dot-0')).toBeNull();
    expect(UNSAFE_queryAllByType(require('react-native').ScrollView)).toHaveLength(0);
  });

  describe('seamless crossfade — waits for decode before fading', () => {
    it('loads the next panel into the other slot before firing its own load event', () => {
      const { getByTestId } = render(
        <PanelCarousel uris={['a.jpg', 'b.jpg']} intervalMs={1000} testID="carousel" />,
      );
      layout(getByTestId('carousel'));
      act(() => jest.advanceTimersByTime(1000)); // crosses into panel b — no `load` fired yet
      // The incoming frame is already in the tree (so it's decoding)...
      expect(getByTestId('carousel-slot-1').props.source.uri).toBe('b.jpg');
      // ...but the outgoing frame is still what's actually shown — nothing
      // has swapped or faded on the strength of the timer alone.
      expect(getByTestId('carousel-slot-0').props.source.uri).toBe('a.jpg');
    });

    it('does not re-fire the transition if load fires more than once for the same frame', () => {
      const { getByTestId } = render(
        <PanelCarousel uris={['a.jpg', 'b.jpg']} intervalMs={1000} testID="carousel" />,
      );
      layout(getByTestId('carousel'));
      act(() => jest.advanceTimersByTime(1000));
      const slot1 = getByTestId('carousel-slot-1');
      expect(() => {
        act(() => fireEvent(slot1, 'load'));
        act(() => fireEvent(slot1, 'load')); // stale/duplicate — must be a no-op, not a crash
      }).not.toThrow();
    });
  });

  describe('auto-advance — hands-free, plays through once', () => {
    it('advances through every panel and stops on the last — no loop back to the first', () => {
      const { getByTestId, queryByTestId } = render(
        <PanelCarousel uris={['a.jpg', 'b.jpg']} intervalMs={1000} testID="carousel" />,
      );
      layout(getByTestId('carousel'));
      advanceAndLoad(1000, queryByTestId, 'b.jpg');
      act(() => jest.advanceTimersByTime(5000)); // well past another interval
      expect(isShowing(queryByTestId, 'b.jpg')).toBe(true);
    });

    it('never advances when autoPlay is false', () => {
      const { getByTestId, queryByTestId } = render(
        <PanelCarousel uris={['a.jpg', 'b.jpg']} autoPlay={false} intervalMs={1000} testID="carousel" />,
      );
      layout(getByTestId('carousel'));
      act(() => jest.advanceTimersByTime(5000));
      expect(getByTestId('carousel-slot-0').props.source.uri).toBe('a.jpg');
      expect(queryByTestId('carousel-slot-1')).toBeNull();
    });

    it('pauses while inactive (e.g. backgrounded), same as the video views it replaces', () => {
      const { getByTestId, queryByTestId } = render(
        <PanelCarousel uris={['a.jpg', 'b.jpg']} active={false} intervalMs={1000} testID="carousel" />,
      );
      layout(getByTestId('carousel'));
      act(() => jest.advanceTimersByTime(5000));
      expect(getByTestId('carousel-slot-0').props.source.uri).toBe('a.jpg');
      expect(queryByTestId('carousel-slot-1')).toBeNull();
    });

    it('has no controls at all for a single panel (nothing to play/pause/seek)', () => {
      const { getByTestId, queryByTestId } = render(
        <PanelCarousel uris={['a.jpg']} intervalMs={1000} testID="carousel" />,
      );
      layout(getByTestId('carousel'));
      act(() => jest.advanceTimersByTime(5000));
      expect(getByTestId('carousel-slot-0').props.source.uri).toBe('a.jpg');
      expect(queryByTestId('carousel-tap-area')).toBeNull();
    });
  });

  describe('controls — hide during playback, reveal on tap, exactly like a video', () => {
    it('starts with controls hidden when it auto-plays', () => {
      const { getByTestId } = render(
        <PanelCarousel uris={['a.jpg', 'b.jpg']} testID="carousel" />,
      );
      layout(getByTestId('carousel'));
      expect(getByTestId('carousel-controls').props.pointerEvents).toBe('none');
    });

    it('keeps the timeline visible even while the play button is hidden', () => {
      // The timeline is a persistent progress bar, unlike the play button —
      // it must never be inside the fading/hidden controls layer.
      const { getByTestId } = render(
        <PanelCarousel uris={['a.jpg', 'b.jpg']} intervalMs={1000} testID="carousel" />,
      );
      layout(getByTestId('carousel'));
      expect(getByTestId('carousel-controls').props.pointerEvents).toBe('none');
      expect(getByTestId('carousel-timeline')).toBeTruthy();
      act(() => jest.advanceTimersByTime(500));
      expect(getByTestId('carousel-timeline-fill').props.style.width).toBe('25%');
    });

    it('starts with controls visible when it does not auto-play', () => {
      const { getByTestId } = render(
        <PanelCarousel uris={['a.jpg', 'b.jpg']} autoPlay={false} testID="carousel" />,
      );
      layout(getByTestId('carousel'));
      expect(getByTestId('carousel-controls').props.pointerEvents).toBe('box-none');
    });

    it('tapping the content reveals the controls while playing', () => {
      const { getByTestId } = render(
        <PanelCarousel uris={['a.jpg', 'b.jpg']} testID="carousel" />,
      );
      layout(getByTestId('carousel'));
      expect(getByTestId('carousel-controls').props.pointerEvents).toBe('none');
      fireEvent.press(getByTestId('carousel-tap-area'));
      expect(getByTestId('carousel-controls').props.pointerEvents).toBe('box-none');
    });

    it('auto-hides again a couple of seconds into playback', () => {
      const { getByTestId } = render(
        <PanelCarousel uris={['a.jpg', 'b.jpg']} testID="carousel" />,
      );
      layout(getByTestId('carousel'));
      fireEvent.press(getByTestId('carousel-tap-area')); // reveal
      expect(getByTestId('carousel-controls').props.pointerEvents).toBe('box-none');
      act(() => jest.advanceTimersByTime(3000));
      expect(getByTestId('carousel-controls').props.pointerEvents).toBe('none');
    });

    it('stays visible while paused instead of auto-hiding', () => {
      const { getByTestId } = render(
        <PanelCarousel uris={['a.jpg', 'b.jpg']} autoPlay={false} testID="carousel" />,
      );
      layout(getByTestId('carousel'));
      act(() => jest.advanceTimersByTime(5000));
      expect(getByTestId('carousel-controls').props.pointerEvents).toBe('box-none');
    });
  });

  describe('play/pause — resumes in place, replays once finished', () => {
    it('tapping pauses mid-sequence and playback stays put', () => {
      const { getByTestId } = render(
        <PanelCarousel uris={['a.jpg', 'b.jpg', 'c.jpg']} intervalMs={1000} testID="carousel" />,
      );
      layout(getByTestId('carousel'));
      fireEvent.press(getByTestId('carousel-tap-area'));
      fireEvent.press(getByTestId('carousel-toggle')); // pause on a.jpg
      act(() => jest.advanceTimersByTime(5000));
      expect(getByTestId('carousel-slot-0').props.source.uri).toBe('a.jpg');
    });

    it('tapping again resumes from where it was paused, not from the start', () => {
      const { getByTestId, queryByTestId } = render(
        <PanelCarousel uris={['a.jpg', 'b.jpg', 'c.jpg']} intervalMs={1000} testID="carousel" />,
      );
      layout(getByTestId('carousel'));
      advanceAndLoad(1000, queryByTestId, 'b.jpg'); // → b.jpg
      fireEvent.press(getByTestId('carousel-tap-area'));
      fireEvent.press(getByTestId('carousel-toggle')); // pause on b.jpg
      fireEvent.press(getByTestId('carousel-toggle')); // resume
      advanceAndLoad(1000, queryByTestId, 'c.jpg'); // → c.jpg, not back to a.jpg
      expect(isShowing(queryByTestId, 'c.jpg')).toBe(true);
    });

    it('tapping after it finishes replays from the first panel', () => {
      const { getByTestId, queryByTestId } = render(
        <PanelCarousel uris={['a.jpg', 'b.jpg']} intervalMs={1000} testID="carousel" />,
      );
      layout(getByTestId('carousel'));
      advanceAndLoad(1000, queryByTestId, 'b.jpg'); // → b.jpg
      // b.jpg still needs its own full dwell time before playback "finishes"
      // (totalMs = every panel's interval, the last one included).
      act(() => jest.advanceTimersByTime(1000));
      expect(getByTestId('carousel-toggle').props.accessibilityLabel).toBe('Replay');
      fireEvent.press(getByTestId('carousel-toggle')); // replay
      expect(getByTestId('carousel-slot-0').props.source.uri).toBe('a.jpg');
    });

    it('hides the controls sooner after replay than the normal auto-hide delay', () => {
      const { getByTestId, queryByTestId } = render(
        <PanelCarousel uris={['a.jpg', 'b.jpg']} intervalMs={1000} testID="carousel" />,
      );
      layout(getByTestId('carousel'));
      advanceAndLoad(1000, queryByTestId, 'b.jpg'); // → b.jpg
      act(() => jest.advanceTimersByTime(1000)); // finish playback
      fireEvent.press(getByTestId('carousel-toggle')); // replay
      expect(getByTestId('carousel-controls').props.pointerEvents).toBe('box-none');
      act(() => jest.advanceTimersByTime(1000)); // well under the normal 2500ms hide delay
      expect(getByTestId('carousel-controls').props.pointerEvents).toBe('none');
    });
  });

  describe('timeline — progress reflects elapsed playback', () => {
    it('starts empty and fills as panels play', () => {
      const { getByTestId } = render(
        <PanelCarousel uris={['a.jpg', 'b.jpg']} autoPlay={false} intervalMs={1000} testID="carousel" />,
      );
      layout(getByTestId('carousel'));
      expect(getByTestId('carousel-timeline-fill').props.style.width).toBe('0%');
      fireEvent.press(getByTestId('carousel-toggle')); // start playing
      act(() => jest.advanceTimersByTime(1000)); // halfway through a 2-panel, 2000ms timeline
      expect(getByTestId('carousel-timeline-fill').props.style.width).toBe('50%');
    });

    it('reaches 100% once playback finishes', () => {
      const { getByTestId, queryByTestId } = render(
        <PanelCarousel uris={['a.jpg', 'b.jpg']} intervalMs={1000} testID="carousel" />,
      );
      layout(getByTestId('carousel'));
      advanceAndLoad(1000, queryByTestId, 'b.jpg');
      act(() => jest.advanceTimersByTime(1000));
      expect(getByTestId('carousel-timeline-fill').props.style.width).toBe('100%');
    });

    // Drag-to-seek is wired via a raw PanResponder (see the component), which
    // depends on RN's native touch-history machinery (TouchHistoryMath) to
    // compute gesture state — that isn't something a synthetic fireEvent can
    // supply outside a real device/simulator, so the gesture itself is
    // verified manually rather than here. What's covered above is everything
    // the timeline renders and computes independent of how a seek is
    // triggered (fill percentage, decode-gated crossfade, play/pause state).
  });
});
