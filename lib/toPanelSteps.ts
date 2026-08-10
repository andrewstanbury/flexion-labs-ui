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
 * Lives here rather than in either app so both narrate identically. The four
 * call sites (client's guided run and How To sheet, practitioner's exercise
 * detail and program editor) are exactly the drift AGENTS.md warns about.
 */
export function toPanelSteps(narration?: string[] | null): PanelStep[] | undefined {
  if (!narration?.length) return undefined;
  const steps = narration
    .filter((text): text is string => typeof text === 'string' && text.trim().length > 0)
    .map((text) => ({ text: text.trim() }));
  return steps.length ? steps : undefined;
}
