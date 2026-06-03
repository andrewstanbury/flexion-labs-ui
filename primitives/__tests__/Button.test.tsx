import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { Button } from '../Button';
import { UIProvider } from '../../UIProvider';

function labelStyle(node: { props: { style: unknown } }) {
  return StyleSheet.flatten(node.props.style as object) as { textTransform?: string };
}

describe('<Button /> shape injection', () => {
  it('fires onPress and renders the label', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button.Primary onPress={onPress}>Go</Button.Primary>);
    fireEvent.press(getByText('Go'));
    expect(onPress).toHaveBeenCalled();
  });

  it("uppercases the label for the default 'raised' shape", () => {
    const { getByText } = render(<Button.Primary>Go</Button.Primary>);
    expect(labelStyle(getByText('Go')).textTransform).toBe('uppercase');
  });

  it("keeps normal case for the injected 'flat' shape", () => {
    const { getByText } = render(
      <UIProvider buttonShape="flat">
        <Button.Primary>Go</Button.Primary>
      </UIProvider>,
    );
    expect(labelStyle(getByText('Go')).textTransform).toBeUndefined();
  });
});
