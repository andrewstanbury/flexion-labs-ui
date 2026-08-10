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
});
