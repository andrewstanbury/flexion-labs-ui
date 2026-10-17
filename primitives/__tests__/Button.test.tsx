import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { Button } from '../Button';
import { theme } from '../../tokens';

function labelStyle(node: { props: { style: unknown } }) {
  return StyleSheet.flatten(node.props.style as object) as { textTransform?: string };
}

describe('<Button />', () => {
  it('fires onPress and renders the label', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button.Primary onPress={onPress}>Go</Button.Primary>);
    fireEvent.press(getByText('Go'));
    expect(onPress).toHaveBeenCalled();
  });

  it('labels in sentence case, not uppercase (v0.30.0)', () => {
    const { getByText } = render(<Button.Primary>Go</Button.Primary>);
    expect(labelStyle(getByText('Go')).textTransform).toBeUndefined();
  });

  it('tints the icon to the button text color, overriding the caller color', () => {
    const seen: (string | undefined)[] = [];
    const Stub = ({ color }: { color?: string }) => {
      seen.push(color);
      return null;
    };
    // Caller passes an arbitrary colour, but the Button forces the icon to its
    // own fg colour — the theme's on-accent colour for a primary button.
    render(<Button.Primary leftIcon={<Stub color="#123456" />}>Go</Button.Primary>);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toBe(theme('light').accentOn);
  });
});
