import { render } from '@testing-library/react-native';
import { StorageBar } from '../StorageBar';

describe('<StorageBar />', () => {
  it('renders the used-of-total label', () => {
    const { getByText } = render(<StorageBar used={5 * 1024 * 1024} total={100 * 1024 * 1024} />);
    expect(getByText('5 MB of 100 MB')).toBeTruthy();
  });
});
