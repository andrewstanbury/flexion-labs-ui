// Pure lock-transition rules for the App Lock gate, extracted so they can be
// unit tested without the native AppState / LocalAuthentication modules. Shared
// by the patient and practitioner apps.

// Re-lock only when the app returns to the foreground from a FULL background.
// We deliberately ignore `inactive` → `active`: iOS reports `inactive` for the
// system biometric prompt itself, the notification shade, and Control Center —
// re-locking on those would either loop right after a successful unlock or nag
// the user for a momentary glance. A genuine app switch goes through
// `background`, which is what we gate on.
export function shouldLockOnForeground(prev: string, next: string): boolean {
  return next === 'active' && prev === 'background';
}

// The lock is only ARMED (allowed to cover the UI) when the user enabled it AND
// they're signed in. An unauthenticated session shows the login flow, which
// must never sit behind the biometric gate.
export function isLockArmed(enabled: boolean, authenticated: boolean): boolean {
  return enabled && authenticated;
}
