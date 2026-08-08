import type { PanelStep } from '../composites/PanelCarousel';

// Hand-written placeholder narration for the two exercises currently
// processed by the video-to-image pipeline (both 3 panels) — until the
// pipeline/backend can supply real per-panel step text generally. Every
// other panel-image exercise falls back to PanelCarousel's own generic
// "Hold for Ns." placeholder (a caller passing steps?.[i] as undefined for
// an index is fine — see PanelCarousel).
//
// Lives here, not duplicated per app, so both apps' PanelCarousel usages
// (client's guided run + How To sheet, practitioner's exercise detail +
// program editor) narrate identically — the exact drift AGENTS.md warns
// this codebase is prone to. TEMPORARY: delete this file (and its
// `steps={...}` call sites) once real per-panel step text has a home in the
// exercise catalogue itself.
export const PLACEHOLDER_EXERCISE_STEPS: Record<string, PanelStep[]> = {
  '115708': [
    // Seated Heel Raise
    { text: 'Sit tall with your feet flat on the floor, hip-width apart.' },
    { text: 'Raise both heels up as high as you can, squeezing your calves.' },
    { text: 'Lower your heels back down slowly to the floor.' },
  ],
  '17944': [
    // Bodyweight Squat
    { text: 'Stand with your feet shoulder-width apart, chest up.' },
    { text: 'Bend your knees and lower your hips as if sitting into a chair.' },
    { text: 'Push through your heels to stand back up.' },
  ],
};
