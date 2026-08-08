import { render } from '@testing-library/react-native';
import { IconBubble } from '../IconBubble';

describe('<IconBubble />', () => {
  it('renders the given icon', () => {
    const { getByText } = render(<IconBubble name="lock-closed-outline" color="#000" />);
    expect(getByText('lock-closed-outline')).toBeTruthy();
  });
});
