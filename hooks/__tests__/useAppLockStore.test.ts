import { act } from '@testing-library/react-native';
import { createAppLockStore } from '../useAppLockStore';

describe('createAppLockStore', () => {
  it('starts at the caller-supplied default — off for a patient app, on for a data-caching one', () => {
    const useClientLock = createAppLockStore(false);
    const usePractitionerLock = createAppLockStore(true);
    expect(useClientLock.getState().enabled).toBe(false);
    expect(usePractitionerLock.getState().enabled).toBe(true);
  });

  it('setEnabled updates independently of what the default was', () => {
    const useLock = createAppLockStore(false);
    act(() => useLock.getState().setEnabled(true));
    expect(useLock.getState().enabled).toBe(true);
    act(() => useLock.getState().setEnabled(false));
    expect(useLock.getState().enabled).toBe(false);
  });
});
