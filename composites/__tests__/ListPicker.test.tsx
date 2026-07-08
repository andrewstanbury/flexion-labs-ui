import { fireEvent, render } from '@testing-library/react-native';
import { ListPicker } from '../ListPicker';

const OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
] as const;

describe('<ListPicker />', () => {
  it('shows the selected option and hides the list until opened', () => {
    const { getByText, queryByText } = render(
      <ListPicker options={OPTIONS as never} value="en" onChange={jest.fn()} title="Language" />,
    );
    expect(getByText('English')).toBeTruthy();
    // Closed: the other options are not rendered.
    expect(queryByText('Español')).toBeNull();
  });

  it('opens on press and reports the chosen value', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <ListPicker options={OPTIONS as never} value="en" onChange={onChange} title="Language" />,
    );
    fireEvent.press(getByText('English')); // open the sheet
    fireEvent.press(getByText('Español')); // pick a different option
    expect(onChange).toHaveBeenCalledWith('es');
  });
});
