import { NARRATION_BUFFER_MS, NARRATION_RATE, estimateSpeechMs, narrationMs } from '../panelTiming';

describe('panelTiming', () => {
  it('estimates TTS length from word count', () => {
    expect(estimateSpeechMs('one two three')).toBeCloseTo((3 / 130) * 60_000);
    expect(estimateSpeechMs('   ')).toBe(0);
  });

  it('uses the TTS estimate (slowed by the narration rate) when there is no audio', () => {
    const text = 'Stand tall with your feet apart.';
    expect(narrationMs({ text })).toBeCloseTo(estimateSpeechMs(text) / NARRATION_RATE + NARRATION_BUFFER_MS);
  });

  it('uses the measured recording length, not the estimate, when audio is present', () => {
    expect(narrationMs({ text: 'a very long sentence that would estimate much longer than this', audioUrl: 'a.mp3', audioDurationMs: 1000 })).toBe(
      1000 + NARRATION_BUFFER_MS,
    );
  });

  it('falls back to the estimate when the audio has no usable duration', () => {
    const text = 'Lower slowly.';
    expect(narrationMs({ text, audioUrl: 'a.mp3', audioDurationMs: 0 })).toBeCloseTo(
      estimateSpeechMs(text) / NARRATION_RATE + NARRATION_BUFFER_MS,
    );
  });
});
