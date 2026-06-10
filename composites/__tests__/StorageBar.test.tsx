import { render } from '@testing-library/react-native';
import { StorageBar } from '../StorageBar';
import { UIProvider } from '../../UIProvider';
import { theme } from '../../tokens';

describe('<StorageBar />', () => {
  it('renders the used-of-total label', () => {
    const { getByText } = render(<StorageBar used={5 * 1024 * 1024} total={100 * 1024 * 1024} />);
    expect(getByText('5 MB of 100 MB')).toBeTruthy();
  });

  // The dark-mode bug was that the fill colour did not follow the app's scheme
  // and used a hardcoded sage even in light (pink) mode. Drive the scheme
  // explicitly via UIProvider — independent of the OS/NativeWind mock — and pin
  // that the fill uses the on-palette accent for each scheme.
  it('uses the light accent (pink) fill under the light scheme', () => {
    const { getByTestId } = render(
      <UIProvider scheme="light">
        <StorageBar used={50} total={100} />
      </UIProvider>,
    );
    expect(getByTestId('storage-bar-fill').props.style.backgroundColor).toBe(theme('light').accent);
  });

  it('uses the dark accent (sage) fill under the dark scheme', () => {
    const { getByTestId } = render(
      <UIProvider scheme="dark">
        <StorageBar used={50} total={100} />
      </UIProvider>,
    );
    expect(getByTestId('storage-bar-fill').props.style.backgroundColor).toBe(theme('dark').accent);
  });

  it('clamps the fill width to 100% when used exceeds total', () => {
    const { getByTestId } = render(<StorageBar used={200} total={100} />);
    expect(getByTestId('storage-bar-fill').props.style.width).toBe('100%');
  });
});
