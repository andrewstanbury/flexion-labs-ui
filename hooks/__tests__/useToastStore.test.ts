import { act } from '@testing-library/react-native';
import { useToastStore } from '../useToastStore';

// Singleton store — start each test from empty.
beforeEach(() => {
  act(() => useToastStore.getState().clear());
});

describe('useToastStore', () => {
  it('show() adds a toast and defaults the variant to info', () => {
    act(() => useToastStore.getState().show('Saved'));
    const [toast] = useToastStore.getState().toasts;
    expect(toast.message).toBe('Saved');
    expect(toast.variant).toBe('info');
    expect(toast.durationMs).toBeGreaterThan(0);
  });

  it('errors linger longer than confirmations by default', () => {
    act(() => useToastStore.getState().show('boom', { variant: 'error' }));
    act(() => useToastStore.getState().show('done', { variant: 'success' }));
    const [err, ok] = useToastStore.getState().toasts;
    expect(err.durationMs).toBeGreaterThan(ok.durationMs);
  });

  it('respects an explicit durationMs', () => {
    act(() => useToastStore.getState().show('hi', { durationMs: 999 }));
    expect(useToastStore.getState().toasts[0].durationMs).toBe(999);
  });

  it('returns a unique id and dismiss() removes that toast', () => {
    let id = '';
    act(() => {
      id = useToastStore.getState().show('a');
      useToastStore.getState().show('b');
    });
    expect(useToastStore.getState().toasts).toHaveLength(2);
    act(() => useToastStore.getState().dismiss(id));
    expect(useToastStore.getState().toasts.map((t) => t.message)).toEqual(['b']);
  });

  it('caps the visible stack so a burst cannot bury the screen', () => {
    act(() => {
      for (let i = 0; i < 6; i++) useToastStore.getState().show(`m${i}`);
    });
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(3);
    expect(toasts.map((t) => t.message)).toEqual(['m3', 'm4', 'm5']);
  });
});
