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
});
