import { createPersistedStore } from './createPersistedStore';

// App Lock preference. When enabled, the app requires device biometrics
// (Face ID / Touch ID) — or the device passcode as fallback — on cold launch
// and whenever it returns to the foreground. The lock lifecycle itself
// (AppLockGate) is app-local, since it hooks into each app's own root
// layout/navigation, but the on/off preference is identical in shape between
// the two apps — only the DEFAULT differs (client: off, a fresh install is
// never gated, opted into after a successful biometric check; practitioner:
// on, since it caches an identifiable client roster + health/rehab data
// on-device). A factory function, not a singleton store, so each app can
// supply its own default while sharing everything else.
export interface AppLockStore {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
}

export function createAppLockStore(defaultEnabled: boolean) {
  return createPersistedStore<AppLockStore>(
    'app-lock-preference',
    (set) => ({
      enabled: defaultEnabled,
      setEnabled: (enabled) => set({ enabled }),
    }),
    { version: 1 },
  );
}
