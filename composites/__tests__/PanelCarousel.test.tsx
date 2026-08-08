import { fireEvent, render } from '@testing-library/react-native';
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
});
