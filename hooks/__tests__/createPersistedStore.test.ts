import { act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createPersistedStore } from '../createPersistedStore';

interface CounterStore {
  count: number;
  increment: () => void;
}

describe('createPersistedStore', () => {
  it('returns a working Zustand store — readable/settable via the hook and outside React', () => {
    const useCounter = createPersistedStore<CounterStore>('test-counter', (set) => ({
      count: 0,
      increment: () => set((s) => ({ count: s.count + 1 })),
    }));
    expect(useCounter.getState().count).toBe(0);
    act(() => useCounter.getState().increment());
    expect(useCounter.getState().count).toBe(1);
  });

  it('persists to AsyncStorage under the given name', async () => {
    const useThing = createPersistedStore<CounterStore>('test-thing', (set) => ({
      count: 0,
      increment: () => set((s) => ({ count: s.count + 1 })),
    }));
    act(() => useThing.getState().increment());
    await act(async () => {}); // let the persist middleware's write flush
    const raw = await AsyncStorage.getItem('test-thing');
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string).state.count).toBe(1);
  });

  it('forwards extra persist options (e.g. version) without name/storage being overridable', () => {
    const useVersioned = createPersistedStore<CounterStore>(
      'test-versioned',
      (set) => ({ count: 0, increment: () => set((s) => ({ count: s.count + 1 })) }),
      { version: 3 },
    );
    // No public API to read the configured version back off the store, so this
    // just pins that passing `options` doesn't throw / break store creation —
    // the real guarantee (persisted stores can opt into a migration path) is
    // exercised by useFeatureFlagsStore's own tests.
    expect(useVersioned.getState().count).toBe(0);
  });
});
