import { act, fireEvent, render } from '@testing-library/react-native';
import { UIProvider } from '../../UIProvider';
import { IntroAnimation, SPLASH_TILE_FRACTION } from '../IntroAnimation';

const LOOK = { background: '#F4EEE2', ink: '#46624C', dot: '#7A9B7E' };

async function mount(onDone: () => void, extra: Partial<React.ComponentProps<typeof IntroAnimation>> = {}) {
  const r = render(
    <UIProvider>
      <IntroAnimation {...LOOK} tagline="Your recovery, guided" onDone={onDone} {...extra} />
    </UIProvider>,
  );
  await act(async () => {});
  return r;
}

describe('IntroAnimation', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('shows the brand and tagline', async () => {
    const { getByText } = await mount(jest.fn());
    expect(getByText('FlexionLabs')).toBeTruthy();
    expect(getByText('Your recovery, guided')).toBeTruthy();
  });

  it('finishes on its own in a few seconds, once', async () => {
    const onDone = jest.fn();
    await mount(onDone);
    expect(onDone).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(6000);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('a tap skips straight to the fade', async () => {
    const onDone = jest.fn();
    const { getByTestId } = await mount(onDone);
    fireEvent.press(getByTestId('intro-skip'));
    fireEvent.press(getByTestId('intro-skip'));
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('starts on the splash: the icon tile on the backdrop', async () => {
    const { getByTestId } = await mount(jest.fn(), { backdrop: '#46624C', splashSize: 400 });
    const flat = (id: string) => Object.assign({}, ...[getByTestId(id).props.style].flat(3));
    expect(flat('intro-animation').backgroundColor).toBe('#46624C');
    const tile = flat('intro-tile');
    expect(tile.backgroundColor).toBe(LOOK.background);
    // The tile is SPLASH_TILE_FRACTION of the splash image, centred.
    expect(tile.width).toBeCloseTo(400 * SPLASH_TILE_FRACTION);
    expect(tile.height).toBeCloseTo(400 * SPLASH_TILE_FRACTION);
  });

  it('without a backdrop, the screen is the tile colour throughout', async () => {
    const { getByTestId } = await mount(jest.fn());
    const style = Object.assign({}, ...[getByTestId('intro-animation').props.style].flat(3));
    expect(style.backgroundColor).toBe(LOOK.background);
  });

  it('reports its first frame once, for the app to hide the native splash', async () => {
    const onFirstFrame = jest.fn();
    const { getByTestId } = await mount(jest.fn(), { onFirstFrame, splashSize: 200 });
    const layout = { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 844 } } };
    fireEvent(getByTestId('intro-animation'), 'layout', layout);
    fireEvent(getByTestId('intro-animation'), 'layout', layout);
    expect(onFirstFrame).toHaveBeenCalledTimes(1);
  });

  it('holds the first frame for holdMs before moving', async () => {
    const onDone = jest.fn();
    await mount(onDone, { holdMs: 3000 });
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(onDone).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(6000);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
