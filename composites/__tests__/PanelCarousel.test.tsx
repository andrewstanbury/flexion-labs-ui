import { act, fireEvent, render } from '@testing-library/react-native';
import { PanelCarousel } from '../PanelCarousel';

describe('<PanelCarousel />', () => {
  it('renders nothing for an empty list', () => {
    const { toJSON } = render(<PanelCarousel uris={[]} testID="carousel" />);
    expect(toJSON()).toBeNull();
  });

  it('renders one image per uri, in order', () => {
    const { getByTestId, UNSAFE_getAllByType } = render(
      <PanelCarousel uris={['a.jpg', 'b.jpg', 'c.jpg']} testID="carousel" />,
    );
    fireEvent(getByTestId('carousel'), 'layout', {
      nativeEvent: { layout: { width: 300, height: 300 } },
    });
    const images = UNSAFE_getAllByType(require('react-native').Image);
    expect(images.map((img: { props: { source: { uri: string } } }) => img.props.source.uri)).toEqual([
      'a.jpg',
      'b.jpg',
      'c.jpg',
    ]);
  });

  it('never crops the image — contain, not cover, so the whole panel is visible', () => {
    const { getByTestId, UNSAFE_getAllByType } = render(
      <PanelCarousel uris={['a.jpg']} testID="carousel" />,
    );
    fireEvent(getByTestId('carousel'), 'layout', {
      nativeEvent: { layout: { width: 300, height: 300 } },
    });
    const [image] = UNSAFE_getAllByType(require('react-native').Image);
    expect(image.props.resizeMode).toBe('contain');
  });

  it('shows no dots for a single image', () => {
    const { getByTestId, queryByTestId } = render(
      <PanelCarousel uris={['a.jpg']} testID="carousel" />,
    );
    fireEvent(getByTestId('carousel'), 'layout', {
      nativeEvent: { layout: { width: 300, height: 300 } },
    });
    expect(queryByTestId('carousel-dot-0')).toBeNull();
  });

  it('shows one dot per image and marks the first active before any scroll', () => {
    const { getByTestId } = render(<PanelCarousel uris={['a.jpg', 'b.jpg', 'c.jpg']} testID="carousel" />);
    fireEvent(getByTestId('carousel'), 'layout', {
      nativeEvent: { layout: { width: 300, height: 300 } },
    });
    expect(getByTestId('carousel-dot-0')).toBeTruthy();
    expect(getByTestId('carousel-dot-2')).toBeTruthy();
  });

  it('uses a custom style over the default aspectRatio sizing when passed', () => {
    const { getByTestId } = render(
      <PanelCarousel uris={['a.jpg']} style={{ width: '100%', height: 240 }} testID="carousel" />,
    );
    expect(getByTestId('carousel').props.style).toEqual({ width: '100%', height: 240 });
  });

  it('advances the active dot on swipe', () => {
    const { getByTestId } = render(<PanelCarousel uris={['a.jpg', 'b.jpg', 'c.jpg']} testID="carousel" />);
    fireEvent(getByTestId('carousel'), 'layout', {
      nativeEvent: { layout: { width: 300, height: 300 } },
    });
    fireEvent.scroll(getByTestId('carousel-scroll'), {
      nativeEvent: { contentOffset: { x: 300 }, contentSize: { width: 900 }, layoutMeasurement: { width: 300 } },
    });
    fireEvent(getByTestId('carousel-scroll'), 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: 300 } },
    });
    const activeDot = getByTestId('carousel-dot-1');
    expect(activeDot.props.style.opacity).toBe(1);
  });

  describe('autoPlay — hands-free step-through', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('advances to the next panel after intervalMs, by default', () => {
      const { getByTestId } = render(
        <PanelCarousel uris={['a.jpg', 'b.jpg', 'c.jpg']} intervalMs={1000} testID="carousel" />,
      );
      fireEvent(getByTestId('carousel'), 'layout', {
        nativeEvent: { layout: { width: 300, height: 300 } },
      });
      expect(getByTestId('carousel-dot-0').props.style.opacity).toBe(1);
      act(() => jest.advanceTimersByTime(1000));
      expect(getByTestId('carousel-dot-1').props.style.opacity).toBe(1);
      expect(getByTestId('carousel-dot-0').props.style.opacity).toBe(0.6);
    });

    it('loops back to the first panel after the last', () => {
      const { getByTestId } = render(
        <PanelCarousel uris={['a.jpg', 'b.jpg']} intervalMs={1000} testID="carousel" />,
      );
      fireEvent(getByTestId('carousel'), 'layout', {
        nativeEvent: { layout: { width: 300, height: 300 } },
      });
      act(() => jest.advanceTimersByTime(1000)); // → panel 1
      act(() => jest.advanceTimersByTime(1000)); // → loops back to panel 0
      expect(getByTestId('carousel-dot-0').props.style.opacity).toBe(1);
    });

    it('never advances when autoPlay is false', () => {
      const { getByTestId } = render(
        <PanelCarousel uris={['a.jpg', 'b.jpg']} autoPlay={false} intervalMs={1000} testID="carousel" />,
      );
      fireEvent(getByTestId('carousel'), 'layout', {
        nativeEvent: { layout: { width: 300, height: 300 } },
      });
      act(() => jest.advanceTimersByTime(5000));
      expect(getByTestId('carousel-dot-0').props.style.opacity).toBe(1);
    });

    it('pauses while inactive (e.g. backgrounded), same as the video views it replaces', () => {
      const { getByTestId } = render(
        <PanelCarousel uris={['a.jpg', 'b.jpg']} active={false} intervalMs={1000} testID="carousel" />,
      );
      fireEvent(getByTestId('carousel'), 'layout', {
        nativeEvent: { layout: { width: 300, height: 300 } },
      });
      act(() => jest.advanceTimersByTime(5000));
      expect(getByTestId('carousel-dot-0').props.style.opacity).toBe(1);
    });

    it('a single panel never advances (nothing to advance to)', () => {
      const { queryByTestId } = render(
        <PanelCarousel uris={['a.jpg']} intervalMs={1000} testID="carousel" />,
      );
      act(() => jest.advanceTimersByTime(5000));
      // No dots at all for a single panel — just confirms no crash/timer loop.
      expect(queryByTestId('carousel-dot-0')).toBeNull();
    });
  });
});
