import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { Button } from '../Button';

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

  it('uppercases the label (the raised/physical look)', () => {
    const { getByText } = render(<Button.Primary>Go</Button.Primary>);
    expect(labelStyle(getByText('Go')).textTransform).toBe('uppercase');
  });

  it('tints the icon to the button text color, overriding the caller color', () => {
    const seen: (string | undefined)[] = [];
    const Stub = ({ color }: { color?: string }) => {
      seen.push(color);
      return null;
    };
    // Caller passes white, but the Button forces the icon to its own fg color.
    render(<Button.Primary leftIcon={<Stub color="#FFFFFF" />}>Go</Button.Primary>);
    expect(seen).toHaveLength(1);
    expect(seen[0]).not.toBe('#FFFFFF');
    expect(seen[0]).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});
