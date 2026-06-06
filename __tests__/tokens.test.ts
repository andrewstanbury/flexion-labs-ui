import { theme, semantic, colors } from '../tokens';

// Pins the light=pastel-pink / dark=sage-green palette contract. The two
// schemes intentionally diverge: light mode's primary/accent is pastel pink,
// dark mode's is sage green. Filled accent surfaces (Button face, selected
// segment) must carry a readable `accentOn` foreground.

describe('semantic palette', () => {
  it('light mode primary/accent is pastel pink with readable on-color', () => {
    const light = theme('light');
    expect(light.accent).toBe(colors.blossom[500]);
    expect(light.accentSurface).toBe(colors.blossom[300]);
    // Dark plum text on the pale pink face (never white — unreadable on pastel).
    expect(light.accentOn).toBe(colors.blossom[800]);
    expect(light.accentOn).not.toBe(colors.white);
  });

  it('dark mode keeps a sage-green primary with white on-color', () => {
    const dark = theme('dark');
    expect(dark.accent).toBe(colors.sage[400]);
    expect(dark.accentSurface).toBe(colors.sage[400]);
    expect(dark.accentOn).toBe(colors.white);
  });

  it('every scheme exposes the full accent-fill token set', () => {
    for (const scheme of ['light', 'dark'] as const) {
      for (const key of ['accent', 'accentSurface', 'accentOn', 'accentBorder', 'accentEdge'] as const) {
        expect(semantic[scheme][key]).toMatch(/^#|^transparent$/);
      }
    }
  });
});
