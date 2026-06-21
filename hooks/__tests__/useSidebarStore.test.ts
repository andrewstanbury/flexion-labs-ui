import { act } from '@testing-library/react-native';
import { useSidebarStore } from '../useSidebarStore';

// Reset to the persisted default before each test (the store is a singleton).
beforeEach(() => {
  act(() => useSidebarStore.getState().setCollapsed(true));
});

describe('useSidebarStore', () => {
  it('starts collapsed', () => {
    expect(useSidebarStore.getState().collapsed).toBe(true);
  });

  it('toggle flips the collapsed flag', () => {
    act(() => useSidebarStore.getState().toggle());
    expect(useSidebarStore.getState().collapsed).toBe(false);
    act(() => useSidebarStore.getState().toggle());
    expect(useSidebarStore.getState().collapsed).toBe(true);
  });

  it('setCollapsed sets the flag explicitly', () => {
    act(() => useSidebarStore.getState().setCollapsed(false));
    expect(useSidebarStore.getState().collapsed).toBe(false);
  });
});
