import { act } from '@testing-library/react-native';
import { createNavOrderStore, canHideNavTab, canMoveNavTab, pinNavTabsLast } from '../useNavOrderStore';

type Key = 'a' | 'b' | 'c' | 'settings';
const KEYS: readonly Key[] = ['a', 'b', 'c', 'settings'];
const ALWAYS_VISIBLE: readonly Key[] = ['settings'];

function freshStore(name: string) {
  return createNavOrderStore<Key>(name, KEYS, ALWAYS_VISIBLE);
}

describe('createNavOrderStore', () => {
  it('starts with every key visible, in the given order', () => {
    const useNav = freshStore('nav-1');
    expect(useNav.getState().order).toEqual(['a', 'b', 'c', 'settings']);
    expect(Object.values(useNav.getState().hidden).every((v) => !v)).toBe(true);
  });

  it('toggleTab hides a normal tab', () => {
    const useNav = freshStore('nav-2');
    act(() => useNav.getState().toggleTab('a'));
    expect(useNav.getState().hidden.a).toBe(true);
    act(() => useNav.getState().toggleTab('a'));
    expect(useNav.getState().hidden.a).toBe(false);
  });

  it('refuses to hide an always-visible tab', () => {
    const useNav = freshStore('nav-3');
    act(() => useNav.getState().toggleTab('settings'));
    expect(useNav.getState().hidden.settings).toBeFalsy();
  });

  it('refuses to hide the last remaining visible tab, independent of always-visible protection', () => {
    // No always-visible keys here — isolates the "don't go to zero visible
    // tabs" guard from the separate "this specific tab is protected" one.
    type NoProtectedKey = 'x' | 'y';
    const useNav = createNavOrderStore<NoProtectedKey>('nav-4', ['x', 'y'], []);
    act(() => useNav.getState().toggleTab('x'));
    expect(useNav.getState().hidden.x).toBe(true);
    act(() => useNav.getState().toggleTab('y')); // would leave zero visible
    expect(useNav.getState().hidden.y).toBeFalsy();
  });

  it('moveTab swaps adjacent order, no-ops past the boundaries', () => {
    const useNav = freshStore('nav-5');
    act(() => useNav.getState().moveTab('b', 'up'));
    expect(useNav.getState().order).toEqual(['b', 'a', 'c', 'settings']);
    act(() => useNav.getState().moveTab('b', 'up')); // already first
    expect(useNav.getState().order).toEqual(['b', 'a', 'c', 'settings']);
    act(() => useNav.getState().moveTab('settings', 'down')); // already last
    expect(useNav.getState().order[3]).toBe('settings');
  });

  it('reset restores default order and visibility', () => {
    const useNav = freshStore('nav-6');
    act(() => {
      useNav.getState().toggleTab('a');
      useNav.getState().moveTab('c', 'up');
      useNav.getState().reset();
    });
    expect(useNav.getState().order).toEqual(['a', 'b', 'c', 'settings']);
    expect(Object.values(useNav.getState().hidden).every((v) => !v)).toBe(true);
  });
});

describe('canHideNavTab', () => {
  it('always-visible tabs can never be hidden', () => {
    expect(canHideNavTab(KEYS, {}, 'settings', ALWAYS_VISIBLE)).toBe(false);
  });

  it('the last visible tab cannot be hidden', () => {
    const hidden = { a: true, b: true, settings: true };
    expect(canHideNavTab(KEYS, hidden, 'c', ALWAYS_VISIBLE)).toBe(false);
  });

  it('a normal tab with siblings still visible can be hidden', () => {
    expect(canHideNavTab(KEYS, {}, 'a', ALWAYS_VISIBLE)).toBe(true);
  });
});

describe('pinnedLast', () => {
  const PINNED: readonly Key[] = ['settings'];
  const pinnedStore = (name: string) => createNavOrderStore<Key>(name, KEYS, ALWAYS_VISIBLE, PINNED);

  it('pinNavTabsLast moves pinned keys to the end, preserving both groups’ order', () => {
    expect(pinNavTabsLast(['settings', 'a', 'b', 'c'], ['settings'])).toEqual(['a', 'b', 'c', 'settings']);
    expect(pinNavTabsLast(['a', 'settings', 'b'], ['settings'])).toEqual(['a', 'b', 'settings']);
  });

  it('pinNavTabsLast is a no-op when nothing is pinned — existing callers are unaffected', () => {
    expect(pinNavTabsLast(['settings', 'a'], [])).toEqual(['settings', 'a']);
  });

  it('pinNavTabsLast ignores a pinned key that is not in the order', () => {
    expect(pinNavTabsLast(['a', 'b'], ['settings'])).toEqual(['a', 'b']);
  });

  it('refuses to move a pinned tab in either direction', () => {
    const useNav = pinnedStore('pin-1');
    act(() => useNav.getState().moveTab('settings', 'up'));
    expect(useNav.getState().order).toEqual(['a', 'b', 'c', 'settings']);
  });

  it('refuses to move another tab PAST a pinned one', () => {
    // Without this guard, moving the second-to-last tab down swaps it with the
    // pinned tab and unpins it from the other side.
    const useNav = pinnedStore('pin-2');
    act(() => useNav.getState().moveTab('c', 'down'));
    expect(useNav.getState().order).toEqual(['a', 'b', 'c', 'settings']);
  });

  it('still reorders the unpinned tabs freely', () => {
    const useNav = pinnedStore('pin-3');
    act(() => useNav.getState().moveTab('a', 'down'));
    expect(useNav.getState().order).toEqual(['b', 'a', 'c', 'settings']);
    expect(useNav.getState().order[3]).toBe('settings');
  });

  it('reset restores the default order with the pin still applied', () => {
    const useNav = pinnedStore('pin-4');
    act(() => useNav.getState().moveTab('a', 'down'));
    act(() => useNav.getState().reset());
    expect(useNav.getState().order).toEqual(['a', 'b', 'c', 'settings']);
  });

  it('canMoveNavTab reports pinned tabs as immovable', () => {
    expect(canMoveNavTab('settings', PINNED)).toBe(false);
    expect(canMoveNavTab('a', PINNED)).toBe(true);
  });

  it('a pinned tab is still protected from being hidden by alwaysVisible', () => {
    const useNav = pinnedStore('pin-5');
    act(() => useNav.getState().toggleTab('settings'));
    expect(useNav.getState().hidden.settings).toBeFalsy();
  });
});
