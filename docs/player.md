# The panel player (`PanelCarousel`)

The player shows an exercise's illustrated panels like a video, with a
narrator track: a pre-recorded clip per panel where the pipeline made one,
on-device speech (expo-speech) otherwise. It is the most failure-prone surface
in both apps — audio, timing and gestures meet here — so it is built and
tested to one rule:

> **Narration is a function of playback state. Nothing else starts or stops it.**

## How it fits together

| Layer | File | Job |
|---|---|---|
| Playback model | `lib/panelPlayback.ts` | Pure reducer: clock, play/pause, seek, previous/next, scrub, restart, speed, mute, resync, retime, reset. No React, timers or audio. |
| Narration intent | `lib/panelPlayback.ts` (`narrationIntent`) | From state: the one thing the narrator should be doing now — a clip from an offset, a line of speech, or silence — identified by a **take key**. |
| Driver | `lib/narrationDriver.ts` | Makes the narrator match the intent, acting only when the take key changes. Owns which clip is loaded, rewinds, and offsets for clips still loading. |
| Component | `composites/PanelCarousel.tsx` | Dispatches actions and clock ticks, renders state (panels, crossfade, controls, timeline), wires expo-speech/expo-audio into the driver. |
| Timing | `lib/panelTiming.ts` | Panel dwell times from recording length or a speech estimate. |

The take key is `generation:panel:kind`. `generation` bumps on every
**discontinuity** (anything other than the clock running on its own), so each
seek/skip/scrub/restart/resume restarts the narrator exactly once, at the right
point. A natural panel change starts the new panel's line from 0.

### Behaviour, as a video player

- **Load / new exercise:** start at panel 1, its narration from the beginning.
- **Pause / resume:** a recording continues from where it paused. Speech can't
  start mid-sentence: it re-reads the line if early in it, otherwise waits for
  the next panel. Past the end of a recording, silence until the next panel.
- **Restart / replay at the end:** panel 1 and its narration from 0.
- **Previous / next:** jump a panel, keep playing, narrate it from 0.
- **Scrub:** playback holds while the finger is down, resumes after if it was
  playing, narration from the landing point. Any other control ends a scrub
  whose release was lost.
- **Speed:** clock and narration (clip rate, speech rate) change together.
- **Mute / screen reader / off-screen:** narration silent; returning picks up
  at the current point.
- **A failing recording:** that panel falls back to speech and its timing to
  the speech estimate.

## Tests — run on every change

```bash
npm run test:player   # every player test + a coverage floor (also in CI and `verify`)
```

| Suite | Covers |
|---|---|
| `__tests__/panelPlayback.test.ts` | The model and intent, case by case; the driver against a simulated narrator that reproduces the "clip parked at its end" quirk; **400 randomized control sequences** checking invariants after every step (one voice at a time; silent while paused/muted/scrubbing; narration always for the current panel; clips start where intended; restart replays panel 1 from 0; natural advances start at 0). |
| `composites/__tests__/PanelCarousel.playback.test.tsx` | The real component end to end: load, restart, pause/resume, scrubbing through the real PanResponder (synthetic touch history), skip, speed, mixed recording/speech exercises, and the reported glitches. |
| `composites/__tests__/PanelCarousel.test.tsx` | Rendering, crossfade, controls, accessibility, speech and recording basics. |

**Changing the player:** add the case to the model tests first (and, if it is a
new control, to the randomized action list), then a component test if it
touches rendering or gestures. If coverage drops below the floor in
`jest.config.js`, CI fails.

Test-writing notes: advance the clock in tick-sized steps (`playFor`) when a
test cares about intermediate panels — one big `advanceTimersByTime` batches
every tick into a single render, which never happens on a device. Drag tests
must pass each move's real previous position; React Native accumulates `dx`
from it.

## Diagnosing a device-only glitch

Development builds (Expo Go, dev client) log every narration decision as
`[narrator]` lines in the Metro output: each take (key, kind, clip and start
point, playhead), every load/seek/play, each line of speech, and the audio
player's status changes (loaded / playing / finished / error). Reproduce the
glitch, then read the lines around it — the take that should have produced
sound and what the native side reported.

Known device behaviours handled in the component (not visible to mocks):
iOS reports an abandoned load as an error (retried, and ignored when nothing
should be playing); iOS drops speech started right after a stop (150ms gap).

## What only a device can confirm

Automated tests use mocks for expo-audio and expo-speech, so before a release
that touches the player, check once on an iPhone (Expo Go is fine):

1. First panel's recording is audible with the ring/silent switch on silent.
2. Restart, replay, previous and a scrub mid-recording all give sound from the
   right point.
3. Toggling the screen off/on or switching apps mid-panel, then resuming.
4. An exercise without recordings narrates with on-device speech throughout.
