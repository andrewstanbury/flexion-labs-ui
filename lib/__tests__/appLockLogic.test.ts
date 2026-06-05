import { shouldLockOnForeground, isLockArmed } from '../appLockLogic';

describe('appLockLogic', () => {
  describe('shouldLockOnForeground', () => {
    it('re-locks when returning to active from background', () => {
      expect(shouldLockOnForeground('background', 'active')).toBe(true);
    });

    it('does not re-lock from inactive (biometric prompt / control centre)', () => {
      expect(shouldLockOnForeground('inactive', 'active')).toBe(false);
    });

    it('does not lock on transitions that are not into active', () => {
      expect(shouldLockOnForeground('active', 'background')).toBe(false);
      expect(shouldLockOnForeground('background', 'inactive')).toBe(false);
    });
  });

  describe('isLockArmed', () => {
    it('is armed only when enabled AND authenticated', () => {
      expect(isLockArmed(true, true)).toBe(true);
      expect(isLockArmed(true, false)).toBe(false);
      expect(isLockArmed(false, true)).toBe(false);
      expect(isLockArmed(false, false)).toBe(false);
    });
  });
});
