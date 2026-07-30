import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// On-device feature flags: a keyed map of booleans, persisted per device.
//
// Replaces useDevModeStore, which was a single hardcoded boolean. The mechanism
// is generic so adding a flag is a registry entry in the app rather than a new
// store, a new toggle and a new prop each time.
//
// Deliberately NOT a registry itself. The design system has no opinion about
// which flags exist — each app owns its own list (lib/featureFlags.ts), because
// the flags gate that app's components and the two apps do not have the same
// ones. This file only stores answers.
//
// Values are per device and never leave it. Nothing here is synced, so a flag is
// a local prototyping decision, not a product configuration.
interface FeatureFlagsStore {
  /** Only flags the user has explicitly changed. Absent means "use the default". */
  overrides: Record<string, boolean>;
  setFlag: (id: string, value: boolean) => void;
  reset: () => void;
}

export const useFeatureFlagsStore = create<FeatureFlagsStore>()(
  persist(
    (set) => ({
      overrides: {},
      setFlag: (id, value) =>
        set((s) => ({ overrides: { ...s.overrides, [id]: value } })),
      reset: () => set({ overrides: {} }),
    }),
    {
      name: 'feature-flags',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    },
  ),
);

/**
 * Resolve a flag: the stored override if the user has set one, otherwise the
 * default the app declared.
 *
 * Storing only overrides — rather than every flag's current value — is what lets
 * a default change in code actually take effect. If defaults were written into
 * storage on first run, changing one later would have no effect on any device
 * that had already launched the app, which is a genuinely confusing bug to chase.
 */
export function isFeatureEnabled(
  overrides: Record<string, boolean>,
  id: string,
  defaultValue = false,
): boolean {
  return overrides[id] ?? defaultValue;
}
