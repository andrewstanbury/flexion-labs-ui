import { theme, semantic, colors, layout, shadow, controlHeight, space } from '../tokens';

// Pins the BASE palette contract (what `theme()` returns). Since v0.33.0
// useTheme() softens light-mode filled controls to pastel on top of this —
// see lib/palettes.ts. Light mode follows flexionlabs.com (v0.30.0):
// deep sage primary with white on top, pink as the highlight. Dark mode keeps
// its sage-green primary. Filled accent surfaces (Button face, selected chip)
// must carry a readable `accentOn` foreground.

describe('semantic palette', () => {
  it('light mode primary is deep sage with white on-color, pink as highlight', () => {
    const light = theme('light');
    expect(light.accentSurface).toBe(colors.sage[700]);
    expect(light.accentOn).toBe(colors.white);
    expect(light.highlightSurface).toBe(colors.blossom[100]);
    expect(light.highlightOn).toBe(colors.blossom[800]);
  });

  it('dark mode keeps a sage-green primary with readable deep-sage on-color', () => {
    const dark = theme('dark');
    expect(dark.accent).toBe(colors.sage[400]);
    expect(dark.accentSurface).toBe(colors.sage[400]);
    expect(dark.accentOn).toBe(colors.sage[900]);
  });

  it('every scheme exposes the full accent-fill token set', () => {
    for (const scheme of ['light', 'dark'] as const) {
      for (const key of ['accent', 'accentSurface', 'accentOn', 'accentBorder', 'accentEdge', 'highlight', 'highlightSurface', 'highlightOn'] as const) {
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
    // v0.36.0: the website's soft lift.
    expect(shadow.card.shadowOpacity).toBeCloseTo(0.06);
    expect(shadow.card.shadowRadius).toBe(18);
    expect(shadow.card.shadowOffset).toEqual({ width: 0, height: 6 });
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
