import { theme, semantic, colors, layout, shadow, controlHeight, space } from '../tokens';

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

// The visual scale had NO test pinning it before v0.18.0 — the density and
// shadow values could be changed, in either direction, with a green suite. That
// is how a design system drifts: each individual nudge looks harmless in a diff
// and nothing ever fails. These are deliberate values chosen against a
// reference app, so they are pinned like any other contract.
describe('layout density (v0.18.0)', () => {
  it('uses the tightened page gutters and card padding', () => {
    expect(layout.screenX).toBe(20);
    expect(layout.screenY).toBe(24);
    expect(layout.card).toBe(16);
  });

  it('keeps the LARGER control heights — deliberately not matching Strata', () => {
    // Touch targets were held back from the density pass on purpose: this is a
    // rehab app whose users may have limited dexterity. If a future pass wants
    // 38/46, that is an owner decision, not a consistency cleanup.
    expect(controlHeight.sm).toBe(40);
    expect(controlHeight.md).toBe(48);
  });

  it('keeps gutters on the space scale rather than drifting to loose numbers', () => {
    const scale: number[] = Object.values(space);
    for (const v of [layout.screenX, layout.screenY, layout.card]) {
      expect(scale).toContain(v);
    }
  });
});

describe('card elevation (v0.18.0)', () => {
  it('is a whisper, because the 1px border carries the definition', () => {
    expect(shadow.card.shadowOpacity).toBeCloseTo(0.05);
    expect(shadow.card.shadowRadius).toBe(6);
    expect(shadow.card.shadowOffset).toEqual({ width: 0, height: 1 });
  });

  it('stays lighter than the modal shadow', () => {
    // A guard against "soften everything" or "strengthen everything" sweeps
    // that would flatten the hierarchy between a card and a modal.
    expect(shadow.card.shadowOpacity).toBeLessThan(shadow.modal.shadowOpacity);
    expect(shadow.card.shadowRadius).toBeLessThan(shadow.modal.shadowRadius);
  });

  it('leaves the none variant genuinely flat', () => {
    expect(shadow.none.shadowOpacity).toBe(0);
    expect(shadow.none.elevation).toBe(0);
  });
});
