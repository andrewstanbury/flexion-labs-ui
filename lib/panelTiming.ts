// Pure timing math for PanelCarousel, split out so it is testable without
// rendering the player. Not exported from index.ts — internal to the package.

// Conservative (slower-than-typical) reading pace, so the ESTIMATE of how
// long on-device TTS will take leans long rather than short — better to hold
// a panel a beat too long than cut the narrator off mid-sentence. See
// PanelCarousel for why duration is estimated up front rather than measured.
export const WORDS_PER_MINUTE = 130;
export const NARRATION_BUFFER_MS = 200;
// Slightly slower than expo-speech's default (1.0) — a calmer narrator
// cadence. Divides into the TTS estimate (a slower rate takes longer).
// Pre-generated audio is NOT scaled by this: it was recorded at its natural
// pace and its measured duration is already exact.
export const NARRATION_RATE = 0.92;

export function estimateSpeechMs(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return 0;
  return (words / WORDS_PER_MINUTE) * 60_000;
}

// How long a panel's narration occupies, in natural (1x) time. Pre-generated
// audio uses its measured duration — exact, so no estimate to lean long on —
// and on-device TTS uses the word-count estimate. Both get the same buffer so
// the panel never changes on the narrator's last syllable.
export function narrationMs(step: { text: string; audioUrl?: string; audioDurationMs?: number }): number {
  if (step.audioUrl && step.audioDurationMs && step.audioDurationMs > 0) {
    return step.audioDurationMs + NARRATION_BUFFER_MS;
  }
  return estimateSpeechMs(step.text) / NARRATION_RATE + NARRATION_BUFFER_MS;
}
