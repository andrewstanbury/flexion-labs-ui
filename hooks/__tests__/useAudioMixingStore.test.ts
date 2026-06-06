import { useAudioMixingStore } from '../useAudioMixingStore';

describe('useAudioMixingStore', () => {
  afterEach(() => {
    useAudioMixingStore.setState({ interruptBackgroundAudio: false });
  });

  it('defaults to mixing with background audio (does NOT interrupt)', () => {
    expect(useAudioMixingStore.getState().interruptBackgroundAudio).toBe(false);
  });

  it('toggles via the setter', () => {
    useAudioMixingStore.getState().setInterruptBackgroundAudio(true);
    expect(useAudioMixingStore.getState().interruptBackgroundAudio).toBe(true);
  });
});
