import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { Text } from '../Text';
import { FontScaleProvider } from '../../UIProvider';
import { typography } from '../../tokens';

function fontStyle(node: { props: { style: unknown } }) {
  return StyleSheet.flatten(node.props.style as object) as { fontSize: number; lineHeight: number };
}

describe('Text font scaling', () => {
  // v0.7.0: Text follows the OS text-size (native allowFontScaling), capped by
  // maxFontSizeMultiplier — it no longer multiplies by an in-app FontScaleProvider
  // scale. fontSize stays at the token value; the OS applies scaling at render.
  it('uses the token fontSize/lineHeight (no in-app multiplier)', () => {
    const { getByText } = render(<Text variant="body">Hi</Text>);
    const s = fontStyle(getByText('Hi'));
    expect(s.fontSize).toBe(typography.body.fontSize);
    expect(s.lineHeight).toBe(typography.body.lineHeight);
  });

  it('ignores the deprecated FontScaleProvider (no double-scaling)', () => {
    const { getByText } = render(
      <FontScaleProvider scale={1.3}>
        <Text variant="body">Hi</Text>
      </FontScaleProvider>,
    );
    expect(fontStyle(getByText('Hi')).fontSize).toBe(typography.body.fontSize);
  });

  it('caps OS font scaling via maxFontSizeMultiplier', () => {
    const { getByText } = render(<Text variant="body">Hi</Text>);
    expect(getByText('Hi').props.maxFontSizeMultiplier).toBe(1.5);
  });
});
