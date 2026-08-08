import { createPersistedStore } from './createPersistedStore';

// Whether playing an exercise video interrupts other audio (music, podcasts,
// etc.). Default OFF — the video MIXES with background audio instead of pausing
// it. Exercise videos are muted by default, so interrupting only silences the
// user's own music, which is rarely what they want. Wire `interruptBackgroundAudio`
// into the video player's `audioMixingMode` (doNotMix vs mixWithOthers).
// Lifted into the design system (v0.7.5) so both apps share one store.
interface AudioMixingStore {
  interruptBackgroundAudio: boolean;
  setInterruptBackgroundAudio: (v: boolean) => void;
}

export const useAudioMixingStore = createPersistedStore<AudioMixingStore>(
  'audio-mixing-preference',
  (set) => ({
    interruptBackgroundAudio: false,
    setInterruptBackgroundAudio: (interruptBackgroundAudio) => set({ interruptBackgroundAudio }),
  }),
);
