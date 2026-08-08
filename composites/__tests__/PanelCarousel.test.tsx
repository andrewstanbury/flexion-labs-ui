import { act, fireEvent, render } from '@testing-library/react-native';
import { PanelCarousel } from '../PanelCarousel';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function layout(view: any) {
  fireEvent(view, 'layout', { nativeEvent: { layout: { width: 300, height: 300 } } });
}

describe('<PanelCarousel />', () => {
  it('renders nothing for an empty list', () => {
    const { toJSON } = render(<PanelCarousel uris={[]} testID="carousel" />);
    expect(toJSON()).toBeNull();
  });

  it('shows the first panel initially, contain-fit so nothing is cropped', () => {
    const { getByTestId } = render(<PanelCarousel uris={['a.jpg', 'b.jpg']} testID="carousel" />);
    layout(getByTestId('carousel'));
    const current = getByTestId('carousel-current');
    expect(current.props.source.uri).toBe('a.jpg');
    expect(current.props.resizeMode).toBe('contain');
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

  describe('auto-advance — hands-free, plays through once', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('advances to the next panel after intervalMs, by default', () => {
      const { getByTestId } = render(
        <PanelCarousel uris={['a.jpg', 'b.jpg', 'c.jpg']} intervalMs={1000} testID="carousel" />,
      );
      layout(getByTestId('carousel'));
      act(() => jest.advanceTimersByTime(1000));
      expect(getByTestId('carousel-current').props.source.uri).toBe('b.jpg');
      // The previous frame stays mounted underneath during the crossfade.
      expect(getByTestId('carousel-previous').props.source.uri).toBe('a.jpg');
    });

    it('stops on the last panel — does not loop back to the first', () => {
      const { getByTestId } = render(
        <PanelCarousel uris={['a.jpg', 'b.jpg']} intervalMs={1000} testID="carousel" />,
      );
      layout(getByTestId('carousel'));
      act(() => jest.advanceTimersByTime(1000)); // → b.jpg
      act(() => jest.advanceTimersByTime(5000)); // well past another interval
      expect(getByTestId('carousel-current').props.source.uri).toBe('b.jpg');
    });

    it('never advances when autoPlay is false', () => {
      const { getByTestId } = render(
        <PanelCarousel uris={['a.jpg', 'b.jpg']} autoPlay={false} intervalMs={1000} testID="carousel" />,
      );
      layout(getByTestId('carousel'));
      act(() => jest.advanceTimersByTime(5000));
      expect(getByTestId('carousel-current').props.source.uri).toBe('a.jpg');
    });

    it('pauses while inactive (e.g. backgrounded), same as the video views it replaces', () => {
      const { getByTestId } = render(
        <PanelCarousel uris={['a.jpg', 'b.jpg']} active={false} intervalMs={1000} testID="carousel" />,
      );
      layout(getByTestId('carousel'));
      act(() => jest.advanceTimersByTime(5000));
      expect(getByTestId('carousel-current').props.source.uri).toBe('a.jpg');
    });

    it('a single panel never advances (nothing to advance to)', () => {
      const { getByTestId } = render(
        <PanelCarousel uris={['a.jpg']} intervalMs={1000} testID="carousel" />,
      );
      layout(getByTestId('carousel'));
      act(() => jest.advanceTimersByTime(5000));
      expect(getByTestId('carousel-current').props.source.uri).toBe('a.jpg');
    });

    it('resets to the first panel when the sequence changes (a different exercise)', () => {
      const { getByTestId, rerender } = render(
        <PanelCarousel uris={['a.jpg', 'b.jpg']} intervalMs={1000} testID="carousel" />,
      );
      layout(getByTestId('carousel'));
      act(() => jest.advanceTimersByTime(1000)); // → b.jpg
      expect(getByTestId('carousel-current').props.source.uri).toBe('b.jpg');

      rerender(<PanelCarousel uris={['x.jpg', 'y.jpg']} intervalMs={1000} testID="carousel" />);
      expect(getByTestId('carousel-current').props.source.uri).toBe('x.jpg');
    });
  });

  describe('play/pause control — video-like, not a slider', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('tapping pauses mid-sequence and playback stays put', () => {
      const { getByTestId } = render(
        <PanelCarousel uris={['a.jpg', 'b.jpg', 'c.jpg']} intervalMs={1000} testID="carousel" />,
      );
      layout(getByTestId('carousel'));
      fireEvent.press(getByTestId('carousel-toggle')); // pause on a.jpg
      act(() => jest.advanceTimersByTime(5000));
      expect(getByTestId('carousel-current').props.source.uri).toBe('a.jpg');
    });

    it('tapping again resumes from where it was paused, not from the start', () => {
      const { getByTestId } = render(
        <PanelCarousel uris={['a.jpg', 'b.jpg', 'c.jpg']} intervalMs={1000} testID="carousel" />,
      );
      layout(getByTestId('carousel'));
      act(() => jest.advanceTimersByTime(1000)); // → b.jpg
      fireEvent.press(getByTestId('carousel-toggle')); // pause on b.jpg
      act(() => jest.advanceTimersByTime(5000));
      expect(getByTestId('carousel-current').props.source.uri).toBe('b.jpg');
      fireEvent.press(getByTestId('carousel-toggle')); // resume
      act(() => jest.advanceTimersByTime(1000));
      expect(getByTestId('carousel-current').props.source.uri).toBe('c.jpg');
    });

    it('tapping after it finishes replays from the first panel', () => {
      const { getByTestId } = render(
        <PanelCarousel uris={['a.jpg', 'b.jpg']} intervalMs={1000} testID="carousel" />,
      );
      layout(getByTestId('carousel'));
      act(() => jest.advanceTimersByTime(1000)); // → b.jpg, then auto-stops
      expect(getByTestId('carousel-current').props.source.uri).toBe('b.jpg');
      fireEvent.press(getByTestId('carousel-toggle')); // replay
      expect(getByTestId('carousel-current').props.source.uri).toBe('a.jpg');
      act(() => jest.advanceTimersByTime(1000));
      expect(getByTestId('carousel-current').props.source.uri).toBe('b.jpg');
    });

    it('starts paused when autoPlay is false, and tapping starts playback', () => {
      const { getByTestId } = render(
        <PanelCarousel uris={['a.jpg', 'b.jpg']} autoPlay={false} intervalMs={1000} testID="carousel" />,
      );
      layout(getByTestId('carousel'));
      act(() => jest.advanceTimersByTime(5000));
      expect(getByTestId('carousel-current').props.source.uri).toBe('a.jpg');
      fireEvent.press(getByTestId('carousel-toggle'));
      act(() => jest.advanceTimersByTime(1000));
      expect(getByTestId('carousel-current').props.source.uri).toBe('b.jpg');
    });

    it('has no toggle control for a single panel (nothing to play/pause)', () => {
      const { getByTestId, queryByTestId } = render(
        <PanelCarousel uris={['a.jpg']} testID="carousel" />,
      );
      layout(getByTestId('carousel'));
      expect(queryByTestId('carousel-toggle')).toBeNull();
    });
  });
});
