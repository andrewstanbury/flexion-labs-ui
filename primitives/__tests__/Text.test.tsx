import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { Text } from '../Text';
import { FontScaleProvider } from '../../UIProvider';

function fontStyle(node: { props: { style: unknown } }) {
  return StyleSheet.flatten(node.props.style as object) as { fontSize: number; lineHeight: number };
}

describe('Text font scaling', () => {
  it('multiplies fontSize/lineHeight by the FontScaleProvider scale', () => {
    const base = render(<Text variant="body">Hi</Text>);
    const baseStyle = fontStyle(base.getByText('Hi'));
    base.unmount();

    const scaled = render(
      <FontScaleProvider scale={1.3}>
        <Text variant="body">Hi</Text>
      </FontScaleProvider>,
    );
    const scaledStyle = fontStyle(scaled.getByText('Hi'));
    expect(scaledStyle.fontSize).toBeCloseTo(baseStyle.fontSize * 1.3, 5);
    expect(scaledStyle.lineHeight).toBeCloseTo(baseStyle.lineHeight * 1.3, 5);
  });
});
