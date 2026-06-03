import { fireEvent, render } from '@testing-library/react-native';
import { ToggleRow } from '../ToggleRow';

describe('<ToggleRow />', () => {
  it('renders title + subtitle and toggles', () => {
    const onValueChange = jest.fn();
    const { getByText, getByRole } = render(
      <ToggleRow
        title="Auto-download"
        subtitle="Save videos for offline use"
        value={false}
        onValueChange={onValueChange}
      />,
    );
    expect(getByText('Auto-download')).toBeTruthy();
    expect(getByText('Save videos for offline use')).toBeTruthy();
    fireEvent(getByRole('switch'), 'valueChange', true);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });
});
