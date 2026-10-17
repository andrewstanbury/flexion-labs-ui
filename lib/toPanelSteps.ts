import type { PanelStep } from '../composites/PanelCarousel';

/**
 * Adapts the API's `narration` (one spoken line per panel, in panel order)
 * into the `steps` shape PanelCarousel consumes.
 *
 * Replaces PLACEHOLDER_EXERCISE_STEPS, which hard-coded narration for two
 * exercise ids while the pipeline had no way to supply it. It does now:
 * narration is generated with the panels, approved by a practitioner holding
 * content_reviewer, and promoted onto the exercise.
 *
 * Returns undefined rather than [] for empty input, because PanelCarousel
 * treats undefined as "no narration supplied" and falls back to its own
 * generic timing — an empty array would instead read as "narrate nothing",
 * which is a different and worse outcome for an exercise that simply has not
 * been through the pipeline yet.
 *
 * `narrationAudio` (optional) attaches the pipeline's pre-generated narrator
 * recording to each step; PanelCarousel plays it instead of on-device TTS.
 *
 * Lives here rather than in either app so both narrate identically. The four
 * call sites (client's guided run and How To sheet, practitioner's exercise
 * detail and program editor) are exactly the drift AGENTS.md warns about.
 */
/**
 * One entry of the API's optional `narrationAudio`, parallel to `narration`:
 * the pre-generated narrator recording for that panel, or null where the
 * panel has none (on-device TTS reads its text instead).
 */
export type NarrationAudio = { url: string; durationMs: number } | null;

export function toPanelSteps(
  narration?: string[] | null,
  narrationAudio?: (NarrationAudio | undefined)[] | null,
): PanelStep[] | undefined {
  if (!narration?.length) return undefined;
  // Pair audio by ORIGINAL index before dropping blank lines — filtering first
  // would shift every later recording onto the wrong panel's text.
  const steps: PanelStep[] = [];
  narration.forEach((text, i) => {
    if (typeof text !== 'string' || text.trim().length === 0) return;
    const step: PanelStep = { text: text.trim() };
    const audio = narrationAudio?.[i];
    if (audio && typeof audio.url === 'string' && audio.url.length > 0 && audio.durationMs > 0) {
      step.audioUrl = audio.url;
      step.audioDurationMs = audio.durationMs;
    }
    steps.push(step);
  });
  return steps.length ? steps : undefined;
}
