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

  // v0.16.0 added letterSpacing to the type scale (negative on headings,
  // positive on labels). Text picked style fields one by one, so the new field
  // was silently dropped — the tokens changed and nothing rendered differently.
  // These pin the wiring, not the values: they read from the token, so a future
  // scale change stays free while a dropped field fails loudly.
  it('applies letterSpacing from the token when the variant defines it', () => {
    const { getByText } = render(<Text variant="h1">Hi</Text>);
    const s = fontStyle(getByText('Hi')) as { letterSpacing?: number };
    expect(s.letterSpacing).toBe((typography.h1 as { letterSpacing: number }).letterSpacing);
  });

  it('omits letterSpacing entirely for variants without it', () => {
    const { getByText } = render(<Text variant="body">Hi</Text>);
    const s = fontStyle(getByText('Hi')) as { letterSpacing?: number };
    // Not merely undefined-valued: body has no tracking, so the key must not be
    // set at all, or it would override a caller's own style.
    expect('letterSpacing' in typography.body).toBe(false);
    expect(s.letterSpacing).toBeUndefined();
  });
});
