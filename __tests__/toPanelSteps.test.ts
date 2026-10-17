import { toPanelSteps } from '../lib/toPanelSteps';

describe('toPanelSteps', () => {
  it('maps narration lines to panel steps in order', () => {
    expect(toPanelSteps(['Sit tall.', 'Raise your heels.'])).toEqual([
      { text: 'Sit tall.' },
      { text: 'Raise your heels.' },
    ]);
  });

  it('returns undefined for an exercise with no narration', () => {
    // undefined means "nothing supplied", so PanelCarousel falls back to its
    // own generic timing. An empty array would mean "narrate nothing", which
    // silently mutes an exercise that simply has not been through the pipeline.
    expect(toPanelSteps(undefined)).toBeUndefined();
    expect(toPanelSteps(null)).toBeUndefined();
    expect(toPanelSteps([])).toBeUndefined();
  });

  it('drops blank lines rather than speaking silence', () => {
    expect(toPanelSteps(['Sit tall.', '   ', ''])).toEqual([{ text: 'Sit tall.' }]);
  });

  it('returns undefined when every line is blank', () => {
    expect(toPanelSteps(['', '  '])).toBeUndefined();
  });

  it('trims surrounding whitespace so TTS does not pause oddly', () => {
    expect(toPanelSteps(['  Sit tall.  '])).toEqual([{ text: 'Sit tall.' }]);
  });

  describe('narrationAudio', () => {
    it('attaches each recording to its own panel', () => {
      expect(
        toPanelSteps(['Sit tall.', 'Raise your heels.'], [{ url: 'a.mp3', durationMs: 1500 }, null]),
      ).toEqual([
        { text: 'Sit tall.', audioUrl: 'a.mp3', audioDurationMs: 1500 },
        { text: 'Raise your heels.' },
      ]);
    });

    it('pairs by original index, so a dropped blank line does not shift later audio', () => {
      expect(
        toPanelSteps(['Sit tall.', '  ', 'Lower slowly.'], [null, { url: 'b.mp3', durationMs: 900 }, { url: 'c.mp3', durationMs: 1200 }]),
      ).toEqual([{ text: 'Sit tall.' }, { text: 'Lower slowly.', audioUrl: 'c.mp3', audioDurationMs: 1200 }]);
    });

    it('ignores unusable audio entries and a short audio array', () => {
      expect(
        toPanelSteps(['One.', 'Two.', 'Three.'], [{ url: '', durationMs: 1000 }, { url: 'x.mp3', durationMs: 0 }]),
      ).toEqual([{ text: 'One.' }, { text: 'Two.' }, { text: 'Three.' }]);
    });

    it('is unchanged when no audio is supplied', () => {
      expect(toPanelSteps(['Sit tall.'], null)).toEqual([{ text: 'Sit tall.' }]);
    });
  });
});
