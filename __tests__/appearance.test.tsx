import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import {
  AppearanceSection, PALETTE_IDS, contrastRatio, pastelFill, Text, UIProvider, colors, paletteRamps, paletteVars, resolvePalette, semantic,
  useAppearanceStore, useTheme, DEFAULT_APPEARANCE,
} from '../index';

afterEach(async () => {
  await act(async () => useAppearanceStore.getState().reset());
});

describe('palettes', () => {
  it('sage keeps the semantic palette, with pastel filled controls in light mode', () => {
    expect(resolvePalette('dark', 'sage')).toEqual(semantic.dark);
    const light = resolvePalette('light');
    expect(light.surface).toBe(semantic.light.surface);
    expect(light.textPrimary).toBe(semantic.light.textPrimary);
    expect(light.accentSurface).toBe(pastelFill(colors.sage[500]).face);
  });

  it('every pastel button label reads at 4.5:1 or better', () => {
    for (const id of PALETTE_IDS) {
      const p = resolvePalette('light', id);
      expect(contrastRatio(p.accentOn, p.accentSurface)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('every palette fills every role with a colour in both schemes', () => {
    for (const id of PALETTE_IDS) {
      for (const scheme of ['light', 'dark'] as const) {
        for (const value of Object.values(resolvePalette(scheme, id))) expect(value).toMatch(/^#[0-9A-F]{6}$/i);
      }
    }
  });

  it('a palette changes the accent and surfaces', () => {
    const harbor = resolvePalette('light', 'harbor');
    expect(harbor.accentSurface).not.toBe(semantic.light.accentSurface);
    expect(harbor.surface).not.toBe(semantic.light.surface);
  });

  it('high contrast promotes secondary and muted text', () => {
    const high = resolvePalette('light', 'sage', 'high');
    expect(high.textSecondary).toBe(semantic.light.textPrimary);
    expect(high.textMuted).toBe(semantic.light.textSecondary);
  });

  it('sage ramps are the existing tailwind ramps, and vars cover sand/sage/brand', () => {
    expect(paletteRamps('sage').sage[700]).toBe(colors.sage[700]);
    const vars = paletteVars('harbor');
    expect(Object.keys(vars)).toHaveLength(32);
    expect(vars['--accent-fill']).toBe(paletteVars('harbor', 'light')['--accent-fill']);
    expect(vars['--sand-50']).toMatch(/^\d+ \d+ \d+$/);
  });

  it('keeps the app-wide selected fills dark enough for white text', () => {
    // ink's dark-mode fill is near-white; the ramp must not hand that to bg-sage-500.
    expect(paletteRamps('ink').sage[500]).not.toBe('#F4F1EA');
  });
});

describe('appearance in components', () => {
  function Probe() {
    const t = useTheme();
    return <Text testID="probe">{t.accentSurface}</Text>;
  }

  it('useTheme follows the saved palette', async () => {
    const { getByTestId } = render(<UIProvider scheme="light"><Probe /></UIProvider>);
    expect(getByTestId('probe').props.children).toBe(resolvePalette('light').accentSurface);
    await act(async () => useAppearanceStore.getState().set({ palette: 'harbor' }));
    await waitFor(() =>
      expect(getByTestId('probe').props.children).toBe(resolvePalette('light', 'harbor').accentSurface),
    );
  });

  it('a provider override pins appearance for its subtree', () => {
    const { getByTestId } = render(
      <UIProvider scheme="light" appearance={{ palette: 'clay' }}><Probe /></UIProvider>,
    );
    expect(getByTestId('probe').props.children).toBe(resolvePalette('light', 'clay').accentSurface);
  });

  it('text size, bold text and font apply to Text', () => {
    const { getByText } = render(
      <UIProvider scheme="light" appearance={{ textSize: 'xl', boldText: true, font: 'serif' }}>
        <Text variant="body">Hi</Text>
      </UIProvider>,
    );
    const style = StyleSheet.flatten(getByText('Hi').props.style);
    expect(style.fontSize).toBeGreaterThan(15);
    expect(style.fontWeight).toBe('600');
    expect(style.fontFamily).toBeTruthy();
  });

  it('AppearanceSection writes choices to the store and resets', () => {
    const { getByLabelText, getByText } = render(<UIProvider scheme="light"><AppearanceSection /></UIProvider>);
    fireEvent.press(getByLabelText('Harbor'));
    expect(useAppearanceStore.getState().palette).toBe('harbor');
    fireEvent.press(getByText('Reset to defaults'));
    expect(useAppearanceStore.getState().palette).toBe(DEFAULT_APPEARANCE.palette);
  });
});
