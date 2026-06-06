import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export const useAudioMixingStore = create<AudioMixingStore>()(
  persist(
    (set) => ({
      interruptBackgroundAudio: false,
      setInterruptBackgroundAudio: (interruptBackgroundAudio) => set({ interruptBackgroundAudio }),
    }),
    {
      name: 'audio-mixing-preference',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
