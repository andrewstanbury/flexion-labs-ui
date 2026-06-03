import { fireEvent, render } from '@testing-library/react-native';
import { SegmentedControl } from '../SegmentedControl';

const OPTIONS = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
] as const;

describe('<SegmentedControl />', () => {
  it('renders all options and reports the chosen value', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <SegmentedControl options={OPTIONS as never} value="a" onChange={onChange} />,
    );
    expect(getByText('Option A')).toBeTruthy();
    fireEvent.press(getByText('Option B'));
    expect(onChange).toHaveBeenCalledWith('b');
  });
});
