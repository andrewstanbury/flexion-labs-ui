import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';

// Returns a function that fires a success / light haptic, gated on the caller's
// `enabled` preference. Each app stores that preference differently, so the flag
// is passed in rather than read from a specific store. The pulse is dispatched in
// a microtask and wrapped in try/catch so a native throw can never unwind a
// render commit (white-screen guard on Expo Go SDK 54). Call it from handlers or
// effects on a CONFIRMED action — never inline on a raw press path.
// Lifted into the design system (v0.7.5) so both apps share one implementation.
export function useHaptic(enabled: boolean) {
  return useCallback(
    (kind: 'success' | 'light' = 'success') => {
      if (!enabled) return;
      queueMicrotask(() => {
        try {
          if (kind === 'success') {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        } catch {
          // Native haptic failures are non-essential UX — swallow.
        }
      });
    },
    [enabled],
  );
}
